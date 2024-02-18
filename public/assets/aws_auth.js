(function () {
    'use strict';

    // packages/alpinejs/src/scheduler.js
    var flushPending = false;
    var flushing = false;
    var queue = [];
    var lastFlushedIndex = -1;
    function scheduler(callback) {
        queueJob(callback);
    }
    function queueJob(job) {
        if (!queue.includes(job)) queue.push(job);
        queueFlush();
    }
    function dequeueJob(job) {
        let index = queue.indexOf(job);
        if (index !== -1 && index > lastFlushedIndex) queue.splice(index, 1);
    }
    function queueFlush() {
        if (!flushing && !flushPending) {
            flushPending = true;
            queueMicrotask(flushJobs);
        }
    }
    function flushJobs() {
        flushPending = false;
        flushing = true;
        for (let i = 0; i < queue.length; i++) {
            queue[i]();
            lastFlushedIndex = i;
        }
        queue.length = 0;
        lastFlushedIndex = -1;
        flushing = false;
    }

    // packages/alpinejs/src/reactivity.js
    var reactive;
    var effect;
    var release;
    var raw;
    var shouldSchedule = true;
    function disableEffectScheduling(callback) {
        shouldSchedule = false;
        callback();
        shouldSchedule = true;
    }
    function setReactivityEngine(engine) {
        reactive = engine.reactive;
        release = engine.release;
        effect = callback => engine.effect(callback, {
            scheduler: task => {
                if (shouldSchedule) {
                    scheduler(task);
                } else {
                    task();
                }
            }
        });
        raw = engine.raw;
    }
    function overrideEffect(override) {
        effect = override;
    }
    function elementBoundEffect(el) {
        let cleanup2 = () => {};
        let wrappedEffect = callback => {
            let effectReference = effect(callback);
            if (!el._x_effects) {
                el._x_effects = new Set();
                el._x_runEffects = () => {
                    el._x_effects.forEach(i => i());
                };
            }
            el._x_effects.add(effectReference);
            cleanup2 = () => {
                if (effectReference === void 0) return;
                el._x_effects.delete(effectReference);
                release(effectReference);
            };
            return effectReference;
        };
        return [wrappedEffect, () => {
            cleanup2();
        }];
    }

    // packages/alpinejs/src/mutation.js
    var onAttributeAddeds = [];
    var onElRemoveds = [];
    var onElAddeds = [];
    function onElAdded(callback) {
        onElAddeds.push(callback);
    }
    function onElRemoved(el, callback) {
        if (typeof callback === "function") {
            if (!el._x_cleanups) el._x_cleanups = [];
            el._x_cleanups.push(callback);
        } else {
            callback = el;
            onElRemoveds.push(callback);
        }
    }
    function onAttributesAdded(callback) {
        onAttributeAddeds.push(callback);
    }
    function onAttributeRemoved(el, name, callback) {
        if (!el._x_attributeCleanups) el._x_attributeCleanups = {};
        if (!el._x_attributeCleanups[name]) el._x_attributeCleanups[name] = [];
        el._x_attributeCleanups[name].push(callback);
    }
    function cleanupAttributes(el, names) {
        if (!el._x_attributeCleanups) return;
        Object.entries(el._x_attributeCleanups).forEach(([name, value]) => {
            if (names === void 0 || names.includes(name)) {
                value.forEach(i => i());
                delete el._x_attributeCleanups[name];
            }
        });
    }
    var observer = new MutationObserver(onMutate);
    var currentlyObserving = false;
    function startObservingMutations() {
        observer.observe(document, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeOldValue: true
        });
        currentlyObserving = true;
    }
    function stopObservingMutations() {
        flushObserver();
        observer.disconnect();
        currentlyObserving = false;
    }
    var recordQueue = [];
    var willProcessRecordQueue = false;
    function flushObserver() {
        recordQueue = recordQueue.concat(observer.takeRecords());
        if (recordQueue.length && !willProcessRecordQueue) {
            willProcessRecordQueue = true;
            queueMicrotask(() => {
                processRecordQueue();
                willProcessRecordQueue = false;
            });
        }
    }
    function processRecordQueue() {
        onMutate(recordQueue);
        recordQueue.length = 0;
    }
    function mutateDom(callback) {
        if (!currentlyObserving) return callback();
        stopObservingMutations();
        let result = callback();
        startObservingMutations();
        return result;
    }
    var isCollecting = false;
    var deferredMutations = [];
    function deferMutations() {
        isCollecting = true;
    }
    function flushAndStopDeferringMutations() {
        isCollecting = false;
        onMutate(deferredMutations);
        deferredMutations = [];
    }
    function onMutate(mutations) {
        if (isCollecting) {
            deferredMutations = deferredMutations.concat(mutations);
            return;
        }
        let addedNodes = [];
        let removedNodes = [];
        let addedAttributes = new Map();
        let removedAttributes = new Map();
        for (let i = 0; i < mutations.length; i++) {
            if (mutations[i].target._x_ignoreMutationObserver) continue;
            if (mutations[i].type === "childList") {
                mutations[i].addedNodes.forEach(node => node.nodeType === 1 && addedNodes.push(node));
                mutations[i].removedNodes.forEach(node => node.nodeType === 1 && removedNodes.push(node));
            }
            if (mutations[i].type === "attributes") {
                let el = mutations[i].target;
                let name = mutations[i].attributeName;
                let oldValue = mutations[i].oldValue;
                let add2 = () => {
                    if (!addedAttributes.has(el)) addedAttributes.set(el, []);
                    addedAttributes.get(el).push({
                        name,
                        value: el.getAttribute(name)
                    });
                };
                let remove = () => {
                    if (!removedAttributes.has(el)) removedAttributes.set(el, []);
                    removedAttributes.get(el).push(name);
                };
                if (el.hasAttribute(name) && oldValue === null) {
                    add2();
                } else if (el.hasAttribute(name)) {
                    remove();
                    add2();
                } else {
                    remove();
                }
            }
        }
        removedAttributes.forEach((attrs, el) => {
            cleanupAttributes(el, attrs);
        });
        addedAttributes.forEach((attrs, el) => {
            onAttributeAddeds.forEach(i => i(el, attrs));
        });
        for (let node of removedNodes) {
            if (addedNodes.includes(node)) continue;
            onElRemoveds.forEach(i => i(node));
            if (node._x_cleanups) {
                while (node._x_cleanups.length) node._x_cleanups.pop()();
            }
        }
        addedNodes.forEach(node => {
            node._x_ignoreSelf = true;
            node._x_ignore = true;
        });
        for (let node of addedNodes) {
            if (removedNodes.includes(node)) continue;
            if (!node.isConnected) continue;
            delete node._x_ignoreSelf;
            delete node._x_ignore;
            onElAddeds.forEach(i => i(node));
            node._x_ignore = true;
            node._x_ignoreSelf = true;
        }
        addedNodes.forEach(node => {
            delete node._x_ignoreSelf;
            delete node._x_ignore;
        });
        addedNodes = null;
        removedNodes = null;
        addedAttributes = null;
        removedAttributes = null;
    }

    // packages/alpinejs/src/scope.js
    function scope(node) {
        return mergeProxies(closestDataStack(node));
    }
    function addScopeToNode(node, data2, referenceNode) {
        node._x_dataStack = [data2, ...closestDataStack(referenceNode || node)];
        return () => {
            node._x_dataStack = node._x_dataStack.filter(i => i !== data2);
        };
    }
    function closestDataStack(node) {
        if (node._x_dataStack) return node._x_dataStack;
        if (typeof ShadowRoot === "function" && node instanceof ShadowRoot) {
            return closestDataStack(node.host);
        }
        if (!node.parentNode) {
            return [];
        }
        return closestDataStack(node.parentNode);
    }
    function mergeProxies(objects) {
        let thisProxy = new Proxy({}, {
            ownKeys: () => {
                return Array.from(new Set(objects.flatMap(i => Object.keys(i))));
            },
            has: (target, name) => {
                return objects.some(obj => obj.hasOwnProperty(name));
            },
            get: (target, name) => {
                return (objects.find(obj => {
                    if (obj.hasOwnProperty(name)) {
                        let descriptor = Object.getOwnPropertyDescriptor(obj, name);
                        if (descriptor.get && descriptor.get._x_alreadyBound || descriptor.set && descriptor.set._x_alreadyBound) {
                            return true;
                        }
                        if ((descriptor.get || descriptor.set) && descriptor.enumerable) {
                            let getter = descriptor.get;
                            let setter = descriptor.set;
                            let property = descriptor;
                            getter = getter && getter.bind(thisProxy);
                            setter = setter && setter.bind(thisProxy);
                            if (getter) getter._x_alreadyBound = true;
                            if (setter) setter._x_alreadyBound = true;
                            Object.defineProperty(obj, name, {
                                ...property,
                                get: getter,
                                set: setter
                            });
                        }
                        return true;
                    }
                    return false;
                }) || {})[name];
            },
            set: (target, name, value) => {
                let closestObjectWithKey = objects.find(obj => obj.hasOwnProperty(name));
                if (closestObjectWithKey) {
                    closestObjectWithKey[name] = value;
                } else {
                    objects[objects.length - 1][name] = value;
                }
                return true;
            }
        });
        return thisProxy;
    }

    // packages/alpinejs/src/interceptor.js
    function initInterceptors(data2) {
        let isObject2 = val => typeof val === "object" && !Array.isArray(val) && val !== null;
        let recurse = (obj, basePath = "") => {
            Object.entries(Object.getOwnPropertyDescriptors(obj)).forEach(([key, {
                value,
                enumerable
            }]) => {
                if (enumerable === false || value === void 0) return;
                let path = basePath === "" ? key : `${basePath}.${key}`;
                if (typeof value === "object" && value !== null && value._x_interceptor) {
                    obj[key] = value.initialize(data2, path, key);
                } else {
                    if (isObject2(value) && value !== obj && !(value instanceof Element)) {
                        recurse(value, path);
                    }
                }
            });
        };
        return recurse(data2);
    }
    function interceptor(callback, mutateObj = () => {}) {
        let obj = {
            initialValue: void 0,
            _x_interceptor: true,
            initialize(data2, path, key) {
                return callback(this.initialValue, () => get(data2, path), value => set(data2, path, value), path, key);
            }
        };
        mutateObj(obj);
        return initialValue => {
            if (typeof initialValue === "object" && initialValue !== null && initialValue._x_interceptor) {
                let initialize = obj.initialize.bind(obj);
                obj.initialize = (data2, path, key) => {
                    let innerValue = initialValue.initialize(data2, path, key);
                    obj.initialValue = innerValue;
                    return initialize(data2, path, key);
                };
            } else {
                obj.initialValue = initialValue;
            }
            return obj;
        };
    }
    function get(obj, path) {
        return path.split(".").reduce((carry, segment) => carry[segment], obj);
    }
    function set(obj, path, value) {
        if (typeof path === "string") path = path.split(".");
        if (path.length === 1) obj[path[0]] = value;else if (path.length === 0) throw error;else {
            if (obj[path[0]]) return set(obj[path[0]], path.slice(1), value);else {
                obj[path[0]] = {};
                return set(obj[path[0]], path.slice(1), value);
            }
        }
    }

    // packages/alpinejs/src/magics.js
    var magics = {};
    function magic(name, callback) {
        magics[name] = callback;
    }
    function injectMagics(obj, el) {
        Object.entries(magics).forEach(([name, callback]) => {
            let memoizedUtilities = null;
            function getUtilities() {
                if (memoizedUtilities) {
                    return memoizedUtilities;
                } else {
                    let [utilities, cleanup2] = getElementBoundUtilities(el);
                    memoizedUtilities = {
                        interceptor,
                        ...utilities
                    };
                    onElRemoved(el, cleanup2);
                    return memoizedUtilities;
                }
            }
            Object.defineProperty(obj, `$${name}`, {
                get() {
                    return callback(el, getUtilities());
                },
                enumerable: false
            });
        });
        return obj;
    }

    // packages/alpinejs/src/utils/error.js
    function tryCatch(el, expression, callback, ...args) {
        try {
            return callback(...args);
        } catch (e) {
            handleError(e, el, expression);
        }
    }
    function handleError(error2, el, expression = void 0) {
        Object.assign(error2, {
            el,
            expression
        });
        console.warn(`Alpine Expression Error: ${error2.message}

${expression ? 'Expression: "' + expression + '"\n\n' : ""}`, el);
        setTimeout(() => {
            throw error2;
        }, 0);
    }

    // packages/alpinejs/src/evaluator.js
    var shouldAutoEvaluateFunctions = true;
    function dontAutoEvaluateFunctions(callback) {
        let cache = shouldAutoEvaluateFunctions;
        shouldAutoEvaluateFunctions = false;
        let result = callback();
        shouldAutoEvaluateFunctions = cache;
        return result;
    }
    function evaluate(el, expression, extras = {}) {
        let result;
        evaluateLater(el, expression)(value => result = value, extras);
        return result;
    }
    function evaluateLater(...args) {
        return theEvaluatorFunction(...args);
    }
    var theEvaluatorFunction = normalEvaluator;
    function setEvaluator(newEvaluator) {
        theEvaluatorFunction = newEvaluator;
    }
    function normalEvaluator(el, expression) {
        let overriddenMagics = {};
        injectMagics(overriddenMagics, el);
        let dataStack = [overriddenMagics, ...closestDataStack(el)];
        let evaluator = typeof expression === "function" ? generateEvaluatorFromFunction(dataStack, expression) : generateEvaluatorFromString(dataStack, expression, el);
        return tryCatch.bind(null, el, expression, evaluator);
    }
    function generateEvaluatorFromFunction(dataStack, func) {
        return (receiver = () => {}, {
            scope: scope2 = {},
            params = []
        } = {}) => {
            let result = func.apply(mergeProxies([scope2, ...dataStack]), params);
            runIfTypeOfFunction(receiver, result);
        };
    }
    var evaluatorMemo = {};
    function generateFunctionFromString(expression, el) {
        if (evaluatorMemo[expression]) {
            return evaluatorMemo[expression];
        }
        let AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        let rightSideSafeExpression = /^[\n\s]*if.*\(.*\)/.test(expression) || /^(let|const)\s/.test(expression) ? `(async()=>{ ${expression} })()` : expression;
        const safeAsyncFunction = () => {
            try {
                return new AsyncFunction(["__self", "scope"], `with (scope) { __self.result = ${rightSideSafeExpression} }; __self.finished = true; return __self.result;`);
            } catch (error2) {
                handleError(error2, el, expression);
                return Promise.resolve();
            }
        };
        let func = safeAsyncFunction();
        evaluatorMemo[expression] = func;
        return func;
    }
    function generateEvaluatorFromString(dataStack, expression, el) {
        let func = generateFunctionFromString(expression, el);
        return (receiver = () => {}, {
            scope: scope2 = {},
            params = []
        } = {}) => {
            func.result = void 0;
            func.finished = false;
            let completeScope = mergeProxies([scope2, ...dataStack]);
            if (typeof func === "function") {
                let promise = func(func, completeScope).catch(error2 => handleError(error2, el, expression));
                if (func.finished) {
                    runIfTypeOfFunction(receiver, func.result, completeScope, params, el);
                    func.result = void 0;
                } else {
                    promise.then(result => {
                        runIfTypeOfFunction(receiver, result, completeScope, params, el);
                    }).catch(error2 => handleError(error2, el, expression)).finally(() => func.result = void 0);
                }
            }
        };
    }
    function runIfTypeOfFunction(receiver, value, scope2, params, el) {
        if (shouldAutoEvaluateFunctions && typeof value === "function") {
            let result = value.apply(scope2, params);
            if (result instanceof Promise) {
                result.then(i => runIfTypeOfFunction(receiver, i, scope2, params)).catch(error2 => handleError(error2, el, value));
            } else {
                receiver(result);
            }
        } else if (typeof value === "object" && value instanceof Promise) {
            value.then(i => receiver(i));
        } else {
            receiver(value);
        }
    }

    // packages/alpinejs/src/directives.js
    var prefixAsString = "x-";
    function prefix(subject = "") {
        return prefixAsString + subject;
    }
    function setPrefix(newPrefix) {
        prefixAsString = newPrefix;
    }
    var directiveHandlers = {};
    function directive(name, callback) {
        directiveHandlers[name] = callback;
        return {
            before(directive2) {
                if (!directiveHandlers[directive2]) {
                    console.warn("Cannot find directive `${directive}`. `${name}` will use the default order of execution");
                    return;
                }
                const pos = directiveOrder.indexOf(directive2);
                directiveOrder.splice(pos >= 0 ? pos : directiveOrder.indexOf("DEFAULT"), 0, name);
            }
        };
    }
    function directives(el, attributes, originalAttributeOverride) {
        attributes = Array.from(attributes);
        if (el._x_virtualDirectives) {
            let vAttributes = Object.entries(el._x_virtualDirectives).map(([name, value]) => ({
                name,
                value
            }));
            let staticAttributes = attributesOnly(vAttributes);
            vAttributes = vAttributes.map(attribute => {
                if (staticAttributes.find(attr => attr.name === attribute.name)) {
                    return {
                        name: `x-bind:${attribute.name}`,
                        value: `"${attribute.value}"`
                    };
                }
                return attribute;
            });
            attributes = attributes.concat(vAttributes);
        }
        let transformedAttributeMap = {};
        let directives2 = attributes.map(toTransformedAttributes((newName, oldName) => transformedAttributeMap[newName] = oldName)).filter(outNonAlpineAttributes).map(toParsedDirectives(transformedAttributeMap, originalAttributeOverride)).sort(byPriority);
        return directives2.map(directive2 => {
            return getDirectiveHandler(el, directive2);
        });
    }
    function attributesOnly(attributes) {
        return Array.from(attributes).map(toTransformedAttributes()).filter(attr => !outNonAlpineAttributes(attr));
    }
    var isDeferringHandlers = false;
    var directiveHandlerStacks = new Map();
    var currentHandlerStackKey = Symbol();
    function deferHandlingDirectives(callback) {
        isDeferringHandlers = true;
        let key = Symbol();
        currentHandlerStackKey = key;
        directiveHandlerStacks.set(key, []);
        let flushHandlers = () => {
            while (directiveHandlerStacks.get(key).length) directiveHandlerStacks.get(key).shift()();
            directiveHandlerStacks.delete(key);
        };
        let stopDeferring = () => {
            isDeferringHandlers = false;
            flushHandlers();
        };
        callback(flushHandlers);
        stopDeferring();
    }
    function getElementBoundUtilities(el) {
        let cleanups = [];
        let cleanup2 = callback => cleanups.push(callback);
        let [effect3, cleanupEffect] = elementBoundEffect(el);
        cleanups.push(cleanupEffect);
        let utilities = {
            Alpine: alpine_default,
            effect: effect3,
            cleanup: cleanup2,
            evaluateLater: evaluateLater.bind(evaluateLater, el),
            evaluate: evaluate.bind(evaluate, el)
        };
        let doCleanup = () => cleanups.forEach(i => i());
        return [utilities, doCleanup];
    }
    function getDirectiveHandler(el, directive2) {
        let noop = () => {};
        let handler4 = directiveHandlers[directive2.type] || noop;
        let [utilities, cleanup2] = getElementBoundUtilities(el);
        onAttributeRemoved(el, directive2.original, cleanup2);
        let fullHandler = () => {
            if (el._x_ignore || el._x_ignoreSelf) return;
            handler4.inline && handler4.inline(el, directive2, utilities);
            handler4 = handler4.bind(handler4, el, directive2, utilities);
            isDeferringHandlers ? directiveHandlerStacks.get(currentHandlerStackKey).push(handler4) : handler4();
        };
        fullHandler.runCleanups = cleanup2;
        return fullHandler;
    }
    var startingWith = (subject, replacement) => ({
                                                      name,
                                                      value
                                                  }) => {
        if (name.startsWith(subject)) name = name.replace(subject, replacement);
        return {
            name,
            value
        };
    };
    var into = i => i;
    function toTransformedAttributes(callback = () => {}) {
        return ({
                    name,
                    value
                }) => {
            let {
                name: newName,
                value: newValue
            } = attributeTransformers.reduce((carry, transform) => {
                return transform(carry);
            }, {
                name,
                value
            });
            if (newName !== name) callback(newName, name);
            return {
                name: newName,
                value: newValue
            };
        };
    }
    var attributeTransformers = [];
    function mapAttributes(callback) {
        attributeTransformers.push(callback);
    }
    function outNonAlpineAttributes({
                                        name
                                    }) {
        return alpineAttributeRegex().test(name);
    }
    var alpineAttributeRegex = () => new RegExp(`^${prefixAsString}([^:^.]+)\\b`);
    function toParsedDirectives(transformedAttributeMap, originalAttributeOverride) {
        return ({
                    name,
                    value
                }) => {
            let typeMatch = name.match(alpineAttributeRegex());
            let valueMatch = name.match(/:([a-zA-Z0-9\-:]+)/);
            let modifiers = name.match(/\.[^.\]]+(?=[^\]]*$)/g) || [];
            let original = originalAttributeOverride || transformedAttributeMap[name] || name;
            return {
                type: typeMatch ? typeMatch[1] : null,
                value: valueMatch ? valueMatch[1] : null,
                modifiers: modifiers.map(i => i.replace(".", "")),
                expression: value,
                original
            };
        };
    }
    var DEFAULT = "DEFAULT";
    var directiveOrder = ["ignore", "ref", "data", "id", "bind", "init", "for", "model", "modelable", "transition", "show", "if", DEFAULT, "teleport"];
    function byPriority(a, b) {
        let typeA = directiveOrder.indexOf(a.type) === -1 ? DEFAULT : a.type;
        let typeB = directiveOrder.indexOf(b.type) === -1 ? DEFAULT : b.type;
        return directiveOrder.indexOf(typeA) - directiveOrder.indexOf(typeB);
    }

    // packages/alpinejs/src/utils/dispatch.js
    function dispatch(el, name, detail = {}) {
        el.dispatchEvent(new CustomEvent(name, {
            detail,
            bubbles: true,
            composed: true,
            cancelable: true
        }));
    }

    // packages/alpinejs/src/utils/walk.js
    function walk(el, callback) {
        if (typeof ShadowRoot === "function" && el instanceof ShadowRoot) {
            Array.from(el.children).forEach(el2 => walk(el2, callback));
            return;
        }
        let skip = false;
        callback(el, () => skip = true);
        if (skip) return;
        let node = el.firstElementChild;
        while (node) {
            walk(node, callback);
            node = node.nextElementSibling;
        }
    }

    // packages/alpinejs/src/utils/warn.js
    function warn(message, ...args) {
        console.warn(`Alpine Warning: ${message}`, ...args);
    }

    // packages/alpinejs/src/lifecycle.js
    var started = false;
    function start() {
        if (started) warn("Alpine has already been initialized on this page. Calling Alpine.start() more than once can cause problems.");
        started = true;
        if (!document.body) warn("Unable to initialize. Trying to load Alpine before `<body>` is available. Did you forget to add `defer` in Alpine's `<script>` tag?");
        dispatch(document, "alpine:init");
        dispatch(document, "alpine:initializing");
        startObservingMutations();
        onElAdded(el => initTree(el, walk));
        onElRemoved(el => destroyTree(el));
        onAttributesAdded((el, attrs) => {
            directives(el, attrs).forEach(handle => handle());
        });
        let outNestedComponents = el => !closestRoot(el.parentElement, true);
        Array.from(document.querySelectorAll(allSelectors())).filter(outNestedComponents).forEach(el => {
            initTree(el);
        });
        dispatch(document, "alpine:initialized");
    }
    var rootSelectorCallbacks = [];
    var initSelectorCallbacks = [];
    function rootSelectors() {
        return rootSelectorCallbacks.map(fn => fn());
    }
    function allSelectors() {
        return rootSelectorCallbacks.concat(initSelectorCallbacks).map(fn => fn());
    }
    function addRootSelector(selectorCallback) {
        rootSelectorCallbacks.push(selectorCallback);
    }
    function addInitSelector(selectorCallback) {
        initSelectorCallbacks.push(selectorCallback);
    }
    function closestRoot(el, includeInitSelectors = false) {
        return findClosest(el, element => {
            const selectors = includeInitSelectors ? allSelectors() : rootSelectors();
            if (selectors.some(selector => element.matches(selector))) return true;
        });
    }
    function findClosest(el, callback) {
        if (!el) return;
        if (callback(el)) return el;
        if (el._x_teleportBack) el = el._x_teleportBack;
        if (!el.parentElement) return;
        return findClosest(el.parentElement, callback);
    }
    function isRoot(el) {
        return rootSelectors().some(selector => el.matches(selector));
    }
    var initInterceptors2 = [];
    function interceptInit(callback) {
        initInterceptors2.push(callback);
    }
    function initTree(el, walker = walk, intercept = () => {}) {
        deferHandlingDirectives(() => {
            walker(el, (el2, skip) => {
                intercept(el2, skip);
                initInterceptors2.forEach(i => i(el2, skip));
                directives(el2, el2.attributes).forEach(handle => handle());
                el2._x_ignore && skip();
            });
        });
    }
    function destroyTree(root) {
        walk(root, el => cleanupAttributes(el));
    }

    // packages/alpinejs/src/nextTick.js
    var tickStack = [];
    var isHolding = false;
    function nextTick(callback = () => {}) {
        queueMicrotask(() => {
            isHolding || setTimeout(() => {
                releaseNextTicks();
            });
        });
        return new Promise(res => {
            tickStack.push(() => {
                callback();
                res();
            });
        });
    }
    function releaseNextTicks() {
        isHolding = false;
        while (tickStack.length) tickStack.shift()();
    }
    function holdNextTicks() {
        isHolding = true;
    }

    // packages/alpinejs/src/utils/classes.js
    function setClasses(el, value) {
        if (Array.isArray(value)) {
            return setClassesFromString(el, value.join(" "));
        } else if (typeof value === "object" && value !== null) {
            return setClassesFromObject(el, value);
        } else if (typeof value === "function") {
            return setClasses(el, value());
        }
        return setClassesFromString(el, value);
    }
    function setClassesFromString(el, classString) {
        let missingClasses = classString2 => classString2.split(" ").filter(i => !el.classList.contains(i)).filter(Boolean);
        let addClassesAndReturnUndo = classes => {
            el.classList.add(...classes);
            return () => {
                el.classList.remove(...classes);
            };
        };
        classString = classString === true ? classString = "" : classString || "";
        return addClassesAndReturnUndo(missingClasses(classString));
    }
    function setClassesFromObject(el, classObject) {
        let split = classString => classString.split(" ").filter(Boolean);
        let forAdd = Object.entries(classObject).flatMap(([classString, bool]) => bool ? split(classString) : false).filter(Boolean);
        let forRemove = Object.entries(classObject).flatMap(([classString, bool]) => !bool ? split(classString) : false).filter(Boolean);
        let added = [];
        let removed = [];
        forRemove.forEach(i => {
            if (el.classList.contains(i)) {
                el.classList.remove(i);
                removed.push(i);
            }
        });
        forAdd.forEach(i => {
            if (!el.classList.contains(i)) {
                el.classList.add(i);
                added.push(i);
            }
        });
        return () => {
            removed.forEach(i => el.classList.add(i));
            added.forEach(i => el.classList.remove(i));
        };
    }

    // packages/alpinejs/src/utils/styles.js
    function setStyles(el, value) {
        if (typeof value === "object" && value !== null) {
            return setStylesFromObject(el, value);
        }
        return setStylesFromString(el, value);
    }
    function setStylesFromObject(el, value) {
        let previousStyles = {};
        Object.entries(value).forEach(([key, value2]) => {
            previousStyles[key] = el.style[key];
            if (!key.startsWith("--")) {
                key = kebabCase(key);
            }
            el.style.setProperty(key, value2);
        });
        setTimeout(() => {
            if (el.style.length === 0) {
                el.removeAttribute("style");
            }
        });
        return () => {
            setStyles(el, previousStyles);
        };
    }
    function setStylesFromString(el, value) {
        let cache = el.getAttribute("style", value);
        el.setAttribute("style", value);
        return () => {
            el.setAttribute("style", cache || "");
        };
    }
    function kebabCase(subject) {
        return subject.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    }

    // packages/alpinejs/src/utils/once.js
    function once(callback, fallback = () => {}) {
        let called = false;
        return function () {
            if (!called) {
                called = true;
                callback.apply(this, arguments);
            } else {
                fallback.apply(this, arguments);
            }
        };
    }

    // packages/alpinejs/src/directives/x-transition.js
    directive("transition", (el, {
        value,
        modifiers,
        expression
    }, {
                                 evaluate: evaluate2
                             }) => {
        if (typeof expression === "function") expression = evaluate2(expression);
        if (expression === false) return;
        if (!expression || typeof expression === "boolean") {
            registerTransitionsFromHelper(el, modifiers, value);
        } else {
            registerTransitionsFromClassString(el, expression, value);
        }
    });
    function registerTransitionsFromClassString(el, classString, stage) {
        registerTransitionObject(el, setClasses, "");
        let directiveStorageMap = {
            enter: classes => {
                el._x_transition.enter.during = classes;
            },
            "enter-start": classes => {
                el._x_transition.enter.start = classes;
            },
            "enter-end": classes => {
                el._x_transition.enter.end = classes;
            },
            leave: classes => {
                el._x_transition.leave.during = classes;
            },
            "leave-start": classes => {
                el._x_transition.leave.start = classes;
            },
            "leave-end": classes => {
                el._x_transition.leave.end = classes;
            }
        };
        directiveStorageMap[stage](classString);
    }
    function registerTransitionsFromHelper(el, modifiers, stage) {
        registerTransitionObject(el, setStyles);
        let doesntSpecify = !modifiers.includes("in") && !modifiers.includes("out") && !stage;
        let transitioningIn = doesntSpecify || modifiers.includes("in") || ["enter"].includes(stage);
        let transitioningOut = doesntSpecify || modifiers.includes("out") || ["leave"].includes(stage);
        if (modifiers.includes("in") && !doesntSpecify) {
            modifiers = modifiers.filter((i, index) => index < modifiers.indexOf("out"));
        }
        if (modifiers.includes("out") && !doesntSpecify) {
            modifiers = modifiers.filter((i, index) => index > modifiers.indexOf("out"));
        }
        let wantsAll = !modifiers.includes("opacity") && !modifiers.includes("scale");
        let wantsOpacity = wantsAll || modifiers.includes("opacity");
        let wantsScale = wantsAll || modifiers.includes("scale");
        let opacityValue = wantsOpacity ? 0 : 1;
        let scaleValue = wantsScale ? modifierValue(modifiers, "scale", 95) / 100 : 1;
        let delay = modifierValue(modifiers, "delay", 0) / 1e3;
        let origin = modifierValue(modifiers, "origin", "center");
        let property = "opacity, transform";
        let durationIn = modifierValue(modifiers, "duration", 150) / 1e3;
        let durationOut = modifierValue(modifiers, "duration", 75) / 1e3;
        let easing = `cubic-bezier(0.4, 0.0, 0.2, 1)`;
        if (transitioningIn) {
            el._x_transition.enter.during = {
                transformOrigin: origin,
                transitionDelay: `${delay}s`,
                transitionProperty: property,
                transitionDuration: `${durationIn}s`,
                transitionTimingFunction: easing
            };
            el._x_transition.enter.start = {
                opacity: opacityValue,
                transform: `scale(${scaleValue})`
            };
            el._x_transition.enter.end = {
                opacity: 1,
                transform: `scale(1)`
            };
        }
        if (transitioningOut) {
            el._x_transition.leave.during = {
                transformOrigin: origin,
                transitionDelay: `${delay}s`,
                transitionProperty: property,
                transitionDuration: `${durationOut}s`,
                transitionTimingFunction: easing
            };
            el._x_transition.leave.start = {
                opacity: 1,
                transform: `scale(1)`
            };
            el._x_transition.leave.end = {
                opacity: opacityValue,
                transform: `scale(${scaleValue})`
            };
        }
    }
    function registerTransitionObject(el, setFunction, defaultValue = {}) {
        if (!el._x_transition) el._x_transition = {
            enter: {
                during: defaultValue,
                start: defaultValue,
                end: defaultValue
            },
            leave: {
                during: defaultValue,
                start: defaultValue,
                end: defaultValue
            },
            in(before = () => {}, after = () => {}) {
                transition(el, setFunction, {
                    during: this.enter.during,
                    start: this.enter.start,
                    end: this.enter.end
                }, before, after);
            },
            out(before = () => {}, after = () => {}) {
                transition(el, setFunction, {
                    during: this.leave.during,
                    start: this.leave.start,
                    end: this.leave.end
                }, before, after);
            }
        };
    }
    window.Element.prototype._x_toggleAndCascadeWithTransitions = function (el, value, show, hide) {
        const nextTick2 = document.visibilityState === "visible" ? requestAnimationFrame : setTimeout;
        let clickAwayCompatibleShow = () => nextTick2(show);
        if (value) {
            if (el._x_transition && (el._x_transition.enter || el._x_transition.leave)) {
                el._x_transition.enter && (Object.entries(el._x_transition.enter.during).length || Object.entries(el._x_transition.enter.start).length || Object.entries(el._x_transition.enter.end).length) ? el._x_transition.in(show) : clickAwayCompatibleShow();
            } else {
                el._x_transition ? el._x_transition.in(show) : clickAwayCompatibleShow();
            }
            return;
        }
        el._x_hidePromise = el._x_transition ? new Promise((resolve, reject) => {
            el._x_transition.out(() => {}, () => resolve(hide));
            el._x_transitioning.beforeCancel(() => reject({
                isFromCancelledTransition: true
            }));
        }) : Promise.resolve(hide);
        queueMicrotask(() => {
            let closest = closestHide(el);
            if (closest) {
                if (!closest._x_hideChildren) closest._x_hideChildren = [];
                closest._x_hideChildren.push(el);
            } else {
                nextTick2(() => {
                    let hideAfterChildren = el2 => {
                        let carry = Promise.all([el2._x_hidePromise, ...(el2._x_hideChildren || []).map(hideAfterChildren)]).then(([i]) => i());
                        delete el2._x_hidePromise;
                        delete el2._x_hideChildren;
                        return carry;
                    };
                    hideAfterChildren(el).catch(e => {
                        if (!e.isFromCancelledTransition) throw e;
                    });
                });
            }
        });
    };
    function closestHide(el) {
        let parent = el.parentNode;
        if (!parent) return;
        return parent._x_hidePromise ? parent : closestHide(parent);
    }
    function transition(el, setFunction, {
        during,
        start: start2,
        end
    } = {}, before = () => {}, after = () => {}) {
        if (el._x_transitioning) el._x_transitioning.cancel();
        if (Object.keys(during).length === 0 && Object.keys(start2).length === 0 && Object.keys(end).length === 0) {
            before();
            after();
            return;
        }
        let undoStart, undoDuring, undoEnd;
        performTransition(el, {
            start() {
                undoStart = setFunction(el, start2);
            },
            during() {
                undoDuring = setFunction(el, during);
            },
            before,
            end() {
                undoStart();
                undoEnd = setFunction(el, end);
            },
            after,
            cleanup() {
                undoDuring();
                undoEnd();
            }
        });
    }
    function performTransition(el, stages) {
        let interrupted, reachedBefore, reachedEnd;
        let finish = once(() => {
            mutateDom(() => {
                interrupted = true;
                if (!reachedBefore) stages.before();
                if (!reachedEnd) {
                    stages.end();
                    releaseNextTicks();
                }
                stages.after();
                if (el.isConnected) stages.cleanup();
                delete el._x_transitioning;
            });
        });
        el._x_transitioning = {
            beforeCancels: [],
            beforeCancel(callback) {
                this.beforeCancels.push(callback);
            },
            cancel: once(function () {
                while (this.beforeCancels.length) {
                    this.beforeCancels.shift()();
                }
                finish();
            }),
            finish
        };
        mutateDom(() => {
            stages.start();
            stages.during();
        });
        holdNextTicks();
        requestAnimationFrame(() => {
            if (interrupted) return;
            let duration = Number(getComputedStyle(el).transitionDuration.replace(/,.*/, "").replace("s", "")) * 1e3;
            let delay = Number(getComputedStyle(el).transitionDelay.replace(/,.*/, "").replace("s", "")) * 1e3;
            if (duration === 0) duration = Number(getComputedStyle(el).animationDuration.replace("s", "")) * 1e3;
            mutateDom(() => {
                stages.before();
            });
            reachedBefore = true;
            requestAnimationFrame(() => {
                if (interrupted) return;
                mutateDom(() => {
                    stages.end();
                });
                releaseNextTicks();
                setTimeout(el._x_transitioning.finish, duration + delay);
                reachedEnd = true;
            });
        });
    }
    function modifierValue(modifiers, key, fallback) {
        if (modifiers.indexOf(key) === -1) return fallback;
        const rawValue = modifiers[modifiers.indexOf(key) + 1];
        if (!rawValue) return fallback;
        if (key === "scale") {
            if (isNaN(rawValue)) return fallback;
        }
        if (key === "duration" || key === "delay") {
            let match = rawValue.match(/([0-9]+)ms/);
            if (match) return match[1];
        }
        if (key === "origin") {
            if (["top", "right", "left", "center", "bottom"].includes(modifiers[modifiers.indexOf(key) + 2])) {
                return [rawValue, modifiers[modifiers.indexOf(key) + 2]].join(" ");
            }
        }
        return rawValue;
    }

    // packages/alpinejs/src/clone.js
    var isCloning = false;
    function skipDuringClone(callback, fallback = () => {}) {
        return (...args) => isCloning ? fallback(...args) : callback(...args);
    }
    function onlyDuringClone(callback) {
        return (...args) => isCloning && callback(...args);
    }
    function clone(oldEl, newEl) {
        if (!newEl._x_dataStack) newEl._x_dataStack = oldEl._x_dataStack;
        isCloning = true;
        dontRegisterReactiveSideEffects(() => {
            cloneTree(newEl);
        });
        isCloning = false;
    }
    function cloneTree(el) {
        let hasRunThroughFirstEl = false;
        let shallowWalker = (el2, callback) => {
            walk(el2, (el3, skip) => {
                if (hasRunThroughFirstEl && isRoot(el3)) return skip();
                hasRunThroughFirstEl = true;
                callback(el3, skip);
            });
        };
        initTree(el, shallowWalker);
    }
    function dontRegisterReactiveSideEffects(callback) {
        let cache = effect;
        overrideEffect((callback2, el) => {
            let storedEffect = cache(callback2);
            release(storedEffect);
            return () => {};
        });
        callback();
        overrideEffect(cache);
    }

    // packages/alpinejs/src/utils/bind.js
    function bind$1(el, name, value, modifiers = []) {
        if (!el._x_bindings) el._x_bindings = reactive({});
        el._x_bindings[name] = value;
        name = modifiers.includes("camel") ? camelCase(name) : name;
        switch (name) {
            case "value":
                bindInputValue(el, value);
                break;
            case "style":
                bindStyles(el, value);
                break;
            case "class":
                bindClasses(el, value);
                break;
            case "selected":
            case "checked":
                bindAttributeAndProperty(el, name, value);
                break;
            default:
                bindAttribute(el, name, value);
                break;
        }
    }
    function bindInputValue(el, value) {
        if (el.type === "radio") {
            if (el.attributes.value === void 0) {
                el.value = value;
            }
            if (window.fromModel) {
                el.checked = checkedAttrLooseCompare(el.value, value);
            }
        } else if (el.type === "checkbox") {
            if (Number.isInteger(value)) {
                el.value = value;
            } else if (!Number.isInteger(value) && !Array.isArray(value) && typeof value !== "boolean" && ![null, void 0].includes(value)) {
                el.value = String(value);
            } else {
                if (Array.isArray(value)) {
                    el.checked = value.some(val => checkedAttrLooseCompare(val, el.value));
                } else {
                    el.checked = !!value;
                }
            }
        } else if (el.tagName === "SELECT") {
            updateSelect(el, value);
        } else {
            if (el.value === value) return;
            el.value = value;
        }
    }
    function bindClasses(el, value) {
        if (el._x_undoAddedClasses) el._x_undoAddedClasses();
        el._x_undoAddedClasses = setClasses(el, value);
    }
    function bindStyles(el, value) {
        if (el._x_undoAddedStyles) el._x_undoAddedStyles();
        el._x_undoAddedStyles = setStyles(el, value);
    }
    function bindAttributeAndProperty(el, name, value) {
        bindAttribute(el, name, value);
        setPropertyIfChanged(el, name, value);
    }
    function bindAttribute(el, name, value) {
        if ([null, void 0, false].includes(value) && attributeShouldntBePreservedIfFalsy(name)) {
            el.removeAttribute(name);
        } else {
            if (isBooleanAttr(name)) value = name;
            setIfChanged(el, name, value);
        }
    }
    function setIfChanged(el, attrName, value) {
        if (el.getAttribute(attrName) != value) {
            el.setAttribute(attrName, value);
        }
    }
    function setPropertyIfChanged(el, propName, value) {
        if (el[propName] !== value) {
            el[propName] = value;
        }
    }
    function updateSelect(el, value) {
        const arrayWrappedValue = [].concat(value).map(value2 => {
            return value2 + "";
        });
        Array.from(el.options).forEach(option => {
            option.selected = arrayWrappedValue.includes(option.value);
        });
    }
    function camelCase(subject) {
        return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
    }
    function checkedAttrLooseCompare(valueA, valueB) {
        return valueA == valueB;
    }
    function isBooleanAttr(attrName) {
        const booleanAttributes = ["disabled", "checked", "required", "readonly", "hidden", "open", "selected", "autofocus", "itemscope", "multiple", "novalidate", "allowfullscreen", "allowpaymentrequest", "formnovalidate", "autoplay", "controls", "loop", "muted", "playsinline", "default", "ismap", "reversed", "async", "defer", "nomodule"];
        return booleanAttributes.includes(attrName);
    }
    function attributeShouldntBePreservedIfFalsy(name) {
        return !["aria-pressed", "aria-checked", "aria-expanded", "aria-selected"].includes(name);
    }
    function getBinding(el, name, fallback) {
        if (el._x_bindings && el._x_bindings[name] !== void 0) return el._x_bindings[name];
        return getAttributeBinding(el, name, fallback);
    }
    function extractProp(el, name, fallback, extract = true) {
        if (el._x_bindings && el._x_bindings[name] !== void 0) return el._x_bindings[name];
        if (el._x_inlineBindings && el._x_inlineBindings[name] !== void 0) {
            let binding = el._x_inlineBindings[name];
            binding.extract = extract;
            return dontAutoEvaluateFunctions(() => {
                return evaluate(el, binding.expression);
            });
        }
        return getAttributeBinding(el, name, fallback);
    }
    function getAttributeBinding(el, name, fallback) {
        let attr = el.getAttribute(name);
        if (attr === null) return typeof fallback === "function" ? fallback() : fallback;
        if (attr === "") return true;
        if (isBooleanAttr(name)) {
            return !![name, "true"].includes(attr);
        }
        return attr;
    }

    // packages/alpinejs/src/utils/debounce.js
    function debounce(func, wait) {
        var timeout;
        return function () {
            var context = this,
                args = arguments;
            var later = function () {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // packages/alpinejs/src/utils/throttle.js
    function throttle(func, limit) {
        let inThrottle;
        return function () {
            let context = this,
                args = arguments;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // packages/alpinejs/src/plugin.js
    function plugin(callback) {
        let callbacks = Array.isArray(callback) ? callback : [callback];
        callbacks.forEach(i => i(alpine_default));
    }

    // packages/alpinejs/src/store.js
    var stores = {};
    var isReactive = false;
    function store(name, value) {
        if (!isReactive) {
            stores = reactive(stores);
            isReactive = true;
        }
        if (value === void 0) {
            return stores[name];
        }
        stores[name] = value;
        if (typeof value === "object" && value !== null && value.hasOwnProperty("init") && typeof value.init === "function") {
            stores[name].init();
        }
        initInterceptors(stores[name]);
    }
    function getStores() {
        return stores;
    }

    // packages/alpinejs/src/binds.js
    var binds = {};
    function bind2(name, bindings) {
        let getBindings = typeof bindings !== "function" ? () => bindings : bindings;
        if (name instanceof Element) {
            applyBindingsObject(name, getBindings());
        } else {
            binds[name] = getBindings;
        }
    }
    function injectBindingProviders(obj) {
        Object.entries(binds).forEach(([name, callback]) => {
            Object.defineProperty(obj, name, {
                get() {
                    return (...args) => {
                        return callback(...args);
                    };
                }
            });
        });
        return obj;
    }
    function applyBindingsObject(el, obj, original) {
        let cleanupRunners = [];
        while (cleanupRunners.length) cleanupRunners.pop()();
        let attributes = Object.entries(obj).map(([name, value]) => ({
            name,
            value
        }));
        let staticAttributes = attributesOnly(attributes);
        attributes = attributes.map(attribute => {
            if (staticAttributes.find(attr => attr.name === attribute.name)) {
                return {
                    name: `x-bind:${attribute.name}`,
                    value: `"${attribute.value}"`
                };
            }
            return attribute;
        });
        directives(el, attributes, original).map(handle => {
            cleanupRunners.push(handle.runCleanups);
            handle();
        });
    }

    // packages/alpinejs/src/datas.js
    var datas = {};
    function data(name, callback) {
        datas[name] = callback;
    }
    function injectDataProviders(obj, context) {
        Object.entries(datas).forEach(([name, callback]) => {
            Object.defineProperty(obj, name, {
                get() {
                    return (...args) => {
                        return callback.bind(context)(...args);
                    };
                },
                enumerable: false
            });
        });
        return obj;
    }

    // packages/alpinejs/src/alpine.js
    var Alpine = {
        get reactive() {
            return reactive;
        },
        get release() {
            return release;
        },
        get effect() {
            return effect;
        },
        get raw() {
            return raw;
        },
        version: "3.12.3",
        flushAndStopDeferringMutations,
        dontAutoEvaluateFunctions,
        disableEffectScheduling,
        startObservingMutations,
        stopObservingMutations,
        setReactivityEngine,
        closestDataStack,
        skipDuringClone,
        onlyDuringClone,
        addRootSelector,
        addInitSelector,
        addScopeToNode,
        deferMutations,
        mapAttributes,
        evaluateLater,
        interceptInit,
        setEvaluator,
        mergeProxies,
        extractProp,
        findClosest,
        closestRoot,
        destroyTree,
        interceptor,
        transition,
        setStyles,
        mutateDom,
        directive,
        throttle,
        debounce,
        evaluate,
        initTree,
        nextTick,
        prefixed: prefix,
        prefix: setPrefix,
        plugin,
        magic,
        store,
        start,
        clone,
        bound: getBinding,
        $data: scope,
        walk,
        data,
        bind: bind2
    };
    var alpine_default = Alpine;

    // node_modules/@vue/shared/dist/shared.esm-bundler.js
    function makeMap(str, expectsLowerCase) {
        const map = Object.create(null);
        const list = str.split(",");
        for (let i = 0; i < list.length; i++) {
            map[list[i]] = true;
        }
        return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val];
    }
    var EMPTY_OBJ = Object.freeze({}) ;
    var extend$1 = Object.assign;
    var hasOwnProperty$1 = Object.prototype.hasOwnProperty;
    var hasOwn = (val, key) => hasOwnProperty$1.call(val, key);
    var isArray$1 = Array.isArray;
    var isMap = val => toTypeString(val) === "[object Map]";
    var isString$1 = val => typeof val === "string";
    var isSymbol = val => typeof val === "symbol";
    var isObject$1 = val => val !== null && typeof val === "object";
    var objectToString = Object.prototype.toString;
    var toTypeString = value => objectToString.call(value);
    var toRawType = value => {
        return toTypeString(value).slice(8, -1);
    };
    var isIntegerKey = key => isString$1(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;
    var cacheStringFunction = fn => {
        const cache = Object.create(null);
        return str => {
            const hit = cache[str];
            return hit || (cache[str] = fn(str));
        };
    };
    var capitalize = cacheStringFunction(str => str.charAt(0).toUpperCase() + str.slice(1));
    var hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);

    // node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js
    var targetMap = new WeakMap();
    var effectStack = [];
    var activeEffect;
    var ITERATE_KEY = Symbol("iterate" );
    var MAP_KEY_ITERATE_KEY = Symbol("Map key iterate" );
    function isEffect(fn) {
        return fn && fn._isEffect === true;
    }
    function effect2(fn, options = EMPTY_OBJ) {
        if (isEffect(fn)) {
            fn = fn.raw;
        }
        const effect3 = createReactiveEffect(fn, options);
        if (!options.lazy) {
            effect3();
        }
        return effect3;
    }
    function stop(effect3) {
        if (effect3.active) {
            cleanup(effect3);
            if (effect3.options.onStop) {
                effect3.options.onStop();
            }
            effect3.active = false;
        }
    }
    var uid = 0;
    function createReactiveEffect(fn, options) {
        const effect3 = function reactiveEffect() {
            if (!effect3.active) {
                return fn();
            }
            if (!effectStack.includes(effect3)) {
                cleanup(effect3);
                try {
                    enableTracking();
                    effectStack.push(effect3);
                    activeEffect = effect3;
                    return fn();
                } finally {
                    effectStack.pop();
                    resetTracking();
                    activeEffect = effectStack[effectStack.length - 1];
                }
            }
        };
        effect3.id = uid++;
        effect3.allowRecurse = !!options.allowRecurse;
        effect3._isEffect = true;
        effect3.active = true;
        effect3.raw = fn;
        effect3.deps = [];
        effect3.options = options;
        return effect3;
    }
    function cleanup(effect3) {
        const {
            deps
        } = effect3;
        if (deps.length) {
            for (let i = 0; i < deps.length; i++) {
                deps[i].delete(effect3);
            }
            deps.length = 0;
        }
    }
    var shouldTrack = true;
    var trackStack = [];
    function pauseTracking() {
        trackStack.push(shouldTrack);
        shouldTrack = false;
    }
    function enableTracking() {
        trackStack.push(shouldTrack);
        shouldTrack = true;
    }
    function resetTracking() {
        const last = trackStack.pop();
        shouldTrack = last === void 0 ? true : last;
    }
    function track(target, type, key) {
        if (!shouldTrack || activeEffect === void 0) {
            return;
        }
        let depsMap = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, depsMap = new Map());
        }
        let dep = depsMap.get(key);
        if (!dep) {
            depsMap.set(key, dep = new Set());
        }
        if (!dep.has(activeEffect)) {
            dep.add(activeEffect);
            activeEffect.deps.push(dep);
            if (activeEffect.options.onTrack) {
                activeEffect.options.onTrack({
                    effect: activeEffect,
                    target,
                    type,
                    key
                });
            }
        }
    }
    function trigger(target, type, key, newValue, oldValue, oldTarget) {
        const depsMap = targetMap.get(target);
        if (!depsMap) {
            return;
        }
        const effects = new Set();
        const add2 = effectsToAdd => {
            if (effectsToAdd) {
                effectsToAdd.forEach(effect3 => {
                    if (effect3 !== activeEffect || effect3.allowRecurse) {
                        effects.add(effect3);
                    }
                });
            }
        };
        if (type === "clear") {
            depsMap.forEach(add2);
        } else if (key === "length" && isArray$1(target)) {
            depsMap.forEach((dep, key2) => {
                if (key2 === "length" || key2 >= newValue) {
                    add2(dep);
                }
            });
        } else {
            if (key !== void 0) {
                add2(depsMap.get(key));
            }
            switch (type) {
                case "add":
                    if (!isArray$1(target)) {
                        add2(depsMap.get(ITERATE_KEY));
                        if (isMap(target)) {
                            add2(depsMap.get(MAP_KEY_ITERATE_KEY));
                        }
                    } else if (isIntegerKey(key)) {
                        add2(depsMap.get("length"));
                    }
                    break;
                case "delete":
                    if (!isArray$1(target)) {
                        add2(depsMap.get(ITERATE_KEY));
                        if (isMap(target)) {
                            add2(depsMap.get(MAP_KEY_ITERATE_KEY));
                        }
                    }
                    break;
                case "set":
                    if (isMap(target)) {
                        add2(depsMap.get(ITERATE_KEY));
                    }
                    break;
            }
        }
        const run = effect3 => {
            if (effect3.options.onTrigger) {
                effect3.options.onTrigger({
                    effect: effect3,
                    target,
                    key,
                    type,
                    newValue,
                    oldValue,
                    oldTarget
                });
            }
            if (effect3.options.scheduler) {
                effect3.options.scheduler(effect3);
            } else {
                effect3();
            }
        };
        effects.forEach(run);
    }
    var isNonTrackableKeys = /* @__PURE__ */makeMap(`__proto__,__v_isRef,__isVue`);
    var builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol).map(key => Symbol[key]).filter(isSymbol));
    var get2 = /* @__PURE__ */createGetter();
    var shallowGet = /* @__PURE__ */createGetter(false, true);
    var readonlyGet = /* @__PURE__ */createGetter(true);
    var shallowReadonlyGet = /* @__PURE__ */createGetter(true, true);
    var arrayInstrumentations = {};
    ["includes", "indexOf", "lastIndexOf"].forEach(key => {
        const method = Array.prototype[key];
        arrayInstrumentations[key] = function (...args) {
            const arr = toRaw(this);
            for (let i = 0, l = this.length; i < l; i++) {
                track(arr, "get", i + "");
            }
            const res = method.apply(arr, args);
            if (res === -1 || res === false) {
                return method.apply(arr, args.map(toRaw));
            } else {
                return res;
            }
        };
    });
    ["push", "pop", "shift", "unshift", "splice"].forEach(key => {
        const method = Array.prototype[key];
        arrayInstrumentations[key] = function (...args) {
            pauseTracking();
            const res = method.apply(this, args);
            resetTracking();
            return res;
        };
    });
    function createGetter(isReadonly = false, shallow = false) {
        return function get3(target, key, receiver) {
            if (key === "__v_isReactive") {
                return !isReadonly;
            } else if (key === "__v_isReadonly") {
                return isReadonly;
            } else if (key === "__v_raw" && receiver === (isReadonly ? shallow ? shallowReadonlyMap : readonlyMap : shallow ? shallowReactiveMap : reactiveMap).get(target)) {
                return target;
            }
            const targetIsArray = isArray$1(target);
            if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
                return Reflect.get(arrayInstrumentations, key, receiver);
            }
            const res = Reflect.get(target, key, receiver);
            if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
                return res;
            }
            if (!isReadonly) {
                track(target, "get", key);
            }
            if (shallow) {
                return res;
            }
            if (isRef(res)) {
                const shouldUnwrap = !targetIsArray || !isIntegerKey(key);
                return shouldUnwrap ? res.value : res;
            }
            if (isObject$1(res)) {
                return isReadonly ? readonly(res) : reactive2(res);
            }
            return res;
        };
    }
    var set2 = /* @__PURE__ */createSetter();
    var shallowSet = /* @__PURE__ */createSetter(true);
    function createSetter(shallow = false) {
        return function set3(target, key, value, receiver) {
            let oldValue = target[key];
            if (!shallow) {
                value = toRaw(value);
                oldValue = toRaw(oldValue);
                if (!isArray$1(target) && isRef(oldValue) && !isRef(value)) {
                    oldValue.value = value;
                    return true;
                }
            }
            const hadKey = isArray$1(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
            const result = Reflect.set(target, key, value, receiver);
            if (target === toRaw(receiver)) {
                if (!hadKey) {
                    trigger(target, "add", key, value);
                } else if (hasChanged(value, oldValue)) {
                    trigger(target, "set", key, value, oldValue);
                }
            }
            return result;
        };
    }
    function deleteProperty(target, key) {
        const hadKey = hasOwn(target, key);
        const oldValue = target[key];
        const result = Reflect.deleteProperty(target, key);
        if (result && hadKey) {
            trigger(target, "delete", key, void 0, oldValue);
        }
        return result;
    }
    function has(target, key) {
        const result = Reflect.has(target, key);
        if (!isSymbol(key) || !builtInSymbols.has(key)) {
            track(target, "has", key);
        }
        return result;
    }
    function ownKeys(target) {
        track(target, "iterate", isArray$1(target) ? "length" : ITERATE_KEY);
        return Reflect.ownKeys(target);
    }
    var mutableHandlers = {
        get: get2,
        set: set2,
        deleteProperty,
        has,
        ownKeys
    };
    var readonlyHandlers = {
        get: readonlyGet,
        set(target, key) {
            {
                console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
            }
            return true;
        },
        deleteProperty(target, key) {
            {
                console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
            }
            return true;
        }
    };
    extend$1({}, mutableHandlers, {
        get: shallowGet,
        set: shallowSet
    });
    extend$1({}, readonlyHandlers, {
        get: shallowReadonlyGet
    });
    var toReactive = value => isObject$1(value) ? reactive2(value) : value;
    var toReadonly = value => isObject$1(value) ? readonly(value) : value;
    var toShallow = value => value;
    var getProto = v => Reflect.getPrototypeOf(v);
    function get$1(target, key, isReadonly = false, isShallow = false) {
        target = target["__v_raw"];
        const rawTarget = toRaw(target);
        const rawKey = toRaw(key);
        if (key !== rawKey) {
            !isReadonly && track(rawTarget, "get", key);
        }
        !isReadonly && track(rawTarget, "get", rawKey);
        const {
            has: has2
        } = getProto(rawTarget);
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
        if (has2.call(rawTarget, key)) {
            return wrap(target.get(key));
        } else if (has2.call(rawTarget, rawKey)) {
            return wrap(target.get(rawKey));
        } else if (target !== rawTarget) {
            target.get(key);
        }
    }
    function has$1(key, isReadonly = false) {
        const target = this["__v_raw"];
        const rawTarget = toRaw(target);
        const rawKey = toRaw(key);
        if (key !== rawKey) {
            !isReadonly && track(rawTarget, "has", key);
        }
        !isReadonly && track(rawTarget, "has", rawKey);
        return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
    }
    function size(target, isReadonly = false) {
        target = target["__v_raw"];
        !isReadonly && track(toRaw(target), "iterate", ITERATE_KEY);
        return Reflect.get(target, "size", target);
    }
    function add(value) {
        value = toRaw(value);
        const target = toRaw(this);
        const proto = getProto(target);
        const hadKey = proto.has.call(target, value);
        if (!hadKey) {
            target.add(value);
            trigger(target, "add", value, value);
        }
        return this;
    }
    function set$1(key, value) {
        value = toRaw(value);
        const target = toRaw(this);
        const {
            has: has2,
            get: get3
        } = getProto(target);
        let hadKey = has2.call(target, key);
        if (!hadKey) {
            key = toRaw(key);
            hadKey = has2.call(target, key);
        } else {
            checkIdentityKeys(target, has2, key);
        }
        const oldValue = get3.call(target, key);
        target.set(key, value);
        if (!hadKey) {
            trigger(target, "add", key, value);
        } else if (hasChanged(value, oldValue)) {
            trigger(target, "set", key, value, oldValue);
        }
        return this;
    }
    function deleteEntry(key) {
        const target = toRaw(this);
        const {
            has: has2,
            get: get3
        } = getProto(target);
        let hadKey = has2.call(target, key);
        if (!hadKey) {
            key = toRaw(key);
            hadKey = has2.call(target, key);
        } else {
            checkIdentityKeys(target, has2, key);
        }
        const oldValue = get3 ? get3.call(target, key) : void 0;
        const result = target.delete(key);
        if (hadKey) {
            trigger(target, "delete", key, void 0, oldValue);
        }
        return result;
    }
    function clear() {
        const target = toRaw(this);
        const hadItems = target.size !== 0;
        const oldTarget = isMap(target) ? new Map(target) : new Set(target) ;
        const result = target.clear();
        if (hadItems) {
            trigger(target, "clear", void 0, void 0, oldTarget);
        }
        return result;
    }
    function createForEach(isReadonly, isShallow) {
        return function forEach(callback, thisArg) {
            const observed = this;
            const target = observed["__v_raw"];
            const rawTarget = toRaw(target);
            const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
            !isReadonly && track(rawTarget, "iterate", ITERATE_KEY);
            return target.forEach((value, key) => {
                return callback.call(thisArg, wrap(value), wrap(key), observed);
            });
        };
    }
    function createIterableMethod(method, isReadonly, isShallow) {
        return function (...args) {
            const target = this["__v_raw"];
            const rawTarget = toRaw(target);
            const targetIsMap = isMap(rawTarget);
            const isPair = method === "entries" || method === Symbol.iterator && targetIsMap;
            const isKeyOnly = method === "keys" && targetIsMap;
            const innerIterator = target[method](...args);
            const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
            !isReadonly && track(rawTarget, "iterate", isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
            return {
                next() {
                    const {
                        value,
                        done
                    } = innerIterator.next();
                    return done ? {
                        value,
                        done
                    } : {
                        value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
                        done
                    };
                },
                [Symbol.iterator]() {
                    return this;
                }
            };
        };
    }
    function createReadonlyMethod(type) {
        return function (...args) {
            {
                const key = args[0] ? `on key "${args[0]}" ` : ``;
                console.warn(`${capitalize(type)} operation ${key}failed: target is readonly.`, toRaw(this));
            }
            return type === "delete" ? false : this;
        };
    }
    var mutableInstrumentations = {
        get(key) {
            return get$1(this, key);
        },
        get size() {
            return size(this);
        },
        has: has$1,
        add,
        set: set$1,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, false)
    };
    var shallowInstrumentations = {
        get(key) {
            return get$1(this, key, false, true);
        },
        get size() {
            return size(this);
        },
        has: has$1,
        add,
        set: set$1,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, true)
    };
    var readonlyInstrumentations = {
        get(key) {
            return get$1(this, key, true);
        },
        get size() {
            return size(this, true);
        },
        has(key) {
            return has$1.call(this, key, true);
        },
        add: createReadonlyMethod("add"),
        set: createReadonlyMethod("set"),
        delete: createReadonlyMethod("delete"),
        clear: createReadonlyMethod("clear"),
        forEach: createForEach(true, false)
    };
    var shallowReadonlyInstrumentations = {
        get(key) {
            return get$1(this, key, true, true);
        },
        get size() {
            return size(this, true);
        },
        has(key) {
            return has$1.call(this, key, true);
        },
        add: createReadonlyMethod("add"),
        set: createReadonlyMethod("set"),
        delete: createReadonlyMethod("delete"),
        clear: createReadonlyMethod("clear"),
        forEach: createForEach(true, true)
    };
    var iteratorMethods = ["keys", "values", "entries", Symbol.iterator];
    iteratorMethods.forEach(method => {
        mutableInstrumentations[method] = createIterableMethod(method, false, false);
        readonlyInstrumentations[method] = createIterableMethod(method, true, false);
        shallowInstrumentations[method] = createIterableMethod(method, false, true);
        shallowReadonlyInstrumentations[method] = createIterableMethod(method, true, true);
    });
    function createInstrumentationGetter(isReadonly, shallow) {
        const instrumentations = shallow ? isReadonly ? shallowReadonlyInstrumentations : shallowInstrumentations : isReadonly ? readonlyInstrumentations : mutableInstrumentations;
        return (target, key, receiver) => {
            if (key === "__v_isReactive") {
                return !isReadonly;
            } else if (key === "__v_isReadonly") {
                return isReadonly;
            } else if (key === "__v_raw") {
                return target;
            }
            return Reflect.get(hasOwn(instrumentations, key) && key in target ? instrumentations : target, key, receiver);
        };
    }
    var mutableCollectionHandlers = {
        get: createInstrumentationGetter(false, false)
    };
    var readonlyCollectionHandlers = {
        get: createInstrumentationGetter(true, false)
    };
    function checkIdentityKeys(target, has2, key) {
        const rawKey = toRaw(key);
        if (rawKey !== key && has2.call(target, rawKey)) {
            const type = toRawType(target);
            console.warn(`Reactive ${type} contains both the raw and reactive versions of the same object${type === `Map` ? ` as keys` : ``}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`);
        }
    }
    var reactiveMap = new WeakMap();
    var shallowReactiveMap = new WeakMap();
    var readonlyMap = new WeakMap();
    var shallowReadonlyMap = new WeakMap();
    function targetTypeMap(rawType) {
        switch (rawType) {
            case "Object":
            case "Array":
                return 1;
            case "Map":
            case "Set":
            case "WeakMap":
            case "WeakSet":
                return 2;
            default:
                return 0;
        }
    }
    function getTargetType(value) {
        return value["__v_skip"] || !Object.isExtensible(value) ? 0 : targetTypeMap(toRawType(value));
    }
    function reactive2(target) {
        if (target && target["__v_isReadonly"]) {
            return target;
        }
        return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
    }
    function readonly(target) {
        return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
    }
    function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
        if (!isObject$1(target)) {
            {
                console.warn(`value cannot be made reactive: ${String(target)}`);
            }
            return target;
        }
        if (target["__v_raw"] && !(isReadonly && target["__v_isReactive"])) {
            return target;
        }
        const existingProxy = proxyMap.get(target);
        if (existingProxy) {
            return existingProxy;
        }
        const targetType = getTargetType(target);
        if (targetType === 0) {
            return target;
        }
        const proxy = new Proxy(target, targetType === 2 ? collectionHandlers : baseHandlers);
        proxyMap.set(target, proxy);
        return proxy;
    }
    function toRaw(observed) {
        return observed && toRaw(observed["__v_raw"]) || observed;
    }
    function isRef(r) {
        return Boolean(r && r.__v_isRef === true);
    }

    // packages/alpinejs/src/magics/$nextTick.js
    magic("nextTick", () => nextTick);

    // packages/alpinejs/src/magics/$dispatch.js
    magic("dispatch", el => dispatch.bind(dispatch, el));

    // packages/alpinejs/src/magics/$watch.js
    magic("watch", (el, {
        evaluateLater: evaluateLater2,
        effect: effect3
    }) => (key, callback) => {
        let evaluate2 = evaluateLater2(key);
        let firstTime = true;
        let oldValue;
        let effectReference = effect3(() => evaluate2(value => {
            JSON.stringify(value);
            if (!firstTime) {
                queueMicrotask(() => {
                    callback(value, oldValue);
                    oldValue = value;
                });
            } else {
                oldValue = value;
            }
            firstTime = false;
        }));
        el._x_effects.delete(effectReference);
    });

    // packages/alpinejs/src/magics/$store.js
    magic("store", getStores);

    // packages/alpinejs/src/magics/$data.js
    magic("data", el => scope(el));

    // packages/alpinejs/src/magics/$root.js
    magic("root", el => closestRoot(el));

    // packages/alpinejs/src/magics/$refs.js
    magic("refs", el => {
        if (el._x_refs_proxy) return el._x_refs_proxy;
        el._x_refs_proxy = mergeProxies(getArrayOfRefObject(el));
        return el._x_refs_proxy;
    });
    function getArrayOfRefObject(el) {
        let refObjects = [];
        let currentEl = el;
        while (currentEl) {
            if (currentEl._x_refs) refObjects.push(currentEl._x_refs);
            currentEl = currentEl.parentNode;
        }
        return refObjects;
    }

    // packages/alpinejs/src/ids.js
    var globalIdMemo = {};
    function findAndIncrementId(name) {
        if (!globalIdMemo[name]) globalIdMemo[name] = 0;
        return ++globalIdMemo[name];
    }
    function closestIdRoot(el, name) {
        return findClosest(el, element => {
            if (element._x_ids && element._x_ids[name]) return true;
        });
    }
    function setIdRoot(el, name) {
        if (!el._x_ids) el._x_ids = {};
        if (!el._x_ids[name]) el._x_ids[name] = findAndIncrementId(name);
    }

    // packages/alpinejs/src/magics/$id.js
    magic("id", el => (name, key = null) => {
        let root = closestIdRoot(el, name);
        let id = root ? root._x_ids[name] : findAndIncrementId(name);
        return key ? `${name}-${id}-${key}` : `${name}-${id}`;
    });

    // packages/alpinejs/src/magics/$el.js
    magic("el", el => el);

    // packages/alpinejs/src/magics/index.js
    warnMissingPluginMagic("Focus", "focus", "focus");
    warnMissingPluginMagic("Persist", "persist", "persist");
    function warnMissingPluginMagic(name, magicName, slug) {
        magic(magicName, el => warn(`You can't use [$${directiveName}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
    }

    // packages/alpinejs/src/entangle.js
    function entangle({
                          get: outerGet,
                          set: outerSet
                      }, {
                          get: innerGet,
                          set: innerSet
                      }) {
        let firstRun = true;
        let outerHash, outerHashLatest;
        let reference = effect(() => {
            let outer, inner;
            if (firstRun) {
                outer = outerGet();
                innerSet(outer);
                inner = innerGet();
                firstRun = false;
            } else {
                outer = outerGet();
                inner = innerGet();
                outerHashLatest = JSON.stringify(outer);
                JSON.stringify(inner);
                if (outerHashLatest !== outerHash) {
                    inner = innerGet();
                    innerSet(outer);
                    inner = outer;
                } else {
                    outerSet(inner);
                    outer = inner;
                }
            }
            outerHash = JSON.stringify(outer);
            JSON.stringify(inner);
        });
        return () => {
            release(reference);
        };
    }

    // packages/alpinejs/src/directives/x-modelable.js
    directive("modelable", (el, {
        expression
    }, {
                                effect: effect3,
                                evaluateLater: evaluateLater2,
                                cleanup: cleanup2
                            }) => {
        let func = evaluateLater2(expression);
        let innerGet = () => {
            let result;
            func(i => result = i);
            return result;
        };
        let evaluateInnerSet = evaluateLater2(`${expression} = __placeholder`);
        let innerSet = val => evaluateInnerSet(() => {}, {
            scope: {
                __placeholder: val
            }
        });
        let initialValue = innerGet();
        innerSet(initialValue);
        queueMicrotask(() => {
            if (!el._x_model) return;
            el._x_removeModelListeners["default"]();
            let outerGet = el._x_model.get;
            let outerSet = el._x_model.set;
            let releaseEntanglement = entangle({
                get() {
                    return outerGet();
                },
                set(value) {
                    outerSet(value);
                }
            }, {
                get() {
                    return innerGet();
                },
                set(value) {
                    innerSet(value);
                }
            });
            cleanup2(releaseEntanglement);
        });
    });

    // packages/alpinejs/src/directives/x-teleport.js
    var teleportContainerDuringClone = document.createElement("div");
    directive("teleport", (el, {
        modifiers,
        expression
    }, {
                               cleanup: cleanup2
                           }) => {
        if (el.tagName.toLowerCase() !== "template") warn("x-teleport can only be used on a <template> tag", el);
        let target = skipDuringClone(() => {
            return document.querySelector(expression);
        }, () => {
            return teleportContainerDuringClone;
        })();
        if (!target) warn(`Cannot find x-teleport element for selector: "${expression}"`);
        let clone2 = el.content.cloneNode(true).firstElementChild;
        el._x_teleport = clone2;
        clone2._x_teleportBack = el;
        if (el._x_forwardEvents) {
            el._x_forwardEvents.forEach(eventName => {
                clone2.addEventListener(eventName, e => {
                    e.stopPropagation();
                    el.dispatchEvent(new e.constructor(e.type, e));
                });
            });
        }
        addScopeToNode(clone2, {}, el);
        mutateDom(() => {
            if (modifiers.includes("prepend")) {
                target.parentNode.insertBefore(clone2, target);
            } else if (modifiers.includes("append")) {
                target.parentNode.insertBefore(clone2, target.nextSibling);
            } else {
                target.appendChild(clone2);
            }
            initTree(clone2);
            clone2._x_ignore = true;
        });
        cleanup2(() => clone2.remove());
    });

    // packages/alpinejs/src/directives/x-ignore.js
    var handler = () => {};
    handler.inline = (el, {
        modifiers
    }, {
                          cleanup: cleanup2
                      }) => {
        modifiers.includes("self") ? el._x_ignoreSelf = true : el._x_ignore = true;
        cleanup2(() => {
            modifiers.includes("self") ? delete el._x_ignoreSelf : delete el._x_ignore;
        });
    };
    directive("ignore", handler);

    // packages/alpinejs/src/directives/x-effect.js
    directive("effect", (el, {
        expression
    }, {
                             effect: effect3
                         }) => effect3(evaluateLater(el, expression)));

    // packages/alpinejs/src/utils/on.js
    function on(el, event, modifiers, callback) {
        let listenerTarget = el;
        let handler4 = e => callback(e);
        let options = {};
        let wrapHandler = (callback2, wrapper) => e => wrapper(callback2, e);
        if (modifiers.includes("dot")) event = dotSyntax(event);
        if (modifiers.includes("camel")) event = camelCase2(event);
        if (modifiers.includes("passive")) options.passive = true;
        if (modifiers.includes("capture")) options.capture = true;
        if (modifiers.includes("window")) listenerTarget = window;
        if (modifiers.includes("document")) listenerTarget = document;
        if (modifiers.includes("debounce")) {
            let nextModifier = modifiers[modifiers.indexOf("debounce") + 1] || "invalid-wait";
            let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
            handler4 = debounce(handler4, wait);
        }
        if (modifiers.includes("throttle")) {
            let nextModifier = modifiers[modifiers.indexOf("throttle") + 1] || "invalid-wait";
            let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
            handler4 = throttle(handler4, wait);
        }
        if (modifiers.includes("prevent")) handler4 = wrapHandler(handler4, (next, e) => {
            e.preventDefault();
            next(e);
        });
        if (modifiers.includes("stop")) handler4 = wrapHandler(handler4, (next, e) => {
            e.stopPropagation();
            next(e);
        });
        if (modifiers.includes("self")) handler4 = wrapHandler(handler4, (next, e) => {
            e.target === el && next(e);
        });
        if (modifiers.includes("away") || modifiers.includes("outside")) {
            listenerTarget = document;
            handler4 = wrapHandler(handler4, (next, e) => {
                if (el.contains(e.target)) return;
                if (e.target.isConnected === false) return;
                if (el.offsetWidth < 1 && el.offsetHeight < 1) return;
                if (el._x_isShown === false) return;
                next(e);
            });
        }
        if (modifiers.includes("once")) {
            handler4 = wrapHandler(handler4, (next, e) => {
                next(e);
                listenerTarget.removeEventListener(event, handler4, options);
            });
        }
        handler4 = wrapHandler(handler4, (next, e) => {
            if (isKeyEvent(event)) {
                if (isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers)) {
                    return;
                }
            }
            next(e);
        });
        listenerTarget.addEventListener(event, handler4, options);
        return () => {
            listenerTarget.removeEventListener(event, handler4, options);
        };
    }
    function dotSyntax(subject) {
        return subject.replace(/-/g, ".");
    }
    function camelCase2(subject) {
        return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
    }
    function isNumeric(subject) {
        return !Array.isArray(subject) && !isNaN(subject);
    }
    function kebabCase2(subject) {
        if ([" ", "_"].includes(subject)) return subject;
        return subject.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[_\s]/, "-").toLowerCase();
    }
    function isKeyEvent(event) {
        return ["keydown", "keyup"].includes(event);
    }
    function isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers) {
        let keyModifiers = modifiers.filter(i => {
            return !["window", "document", "prevent", "stop", "once", "capture"].includes(i);
        });
        if (keyModifiers.includes("debounce")) {
            let debounceIndex = keyModifiers.indexOf("debounce");
            keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
        }
        if (keyModifiers.includes("throttle")) {
            let debounceIndex = keyModifiers.indexOf("throttle");
            keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
        }
        if (keyModifiers.length === 0) return false;
        if (keyModifiers.length === 1 && keyToModifiers(e.key).includes(keyModifiers[0])) return false;
        const systemKeyModifiers = ["ctrl", "shift", "alt", "meta", "cmd", "super"];
        const selectedSystemKeyModifiers = systemKeyModifiers.filter(modifier => keyModifiers.includes(modifier));
        keyModifiers = keyModifiers.filter(i => !selectedSystemKeyModifiers.includes(i));
        if (selectedSystemKeyModifiers.length > 0) {
            const activelyPressedKeyModifiers = selectedSystemKeyModifiers.filter(modifier => {
                if (modifier === "cmd" || modifier === "super") modifier = "meta";
                return e[`${modifier}Key`];
            });
            if (activelyPressedKeyModifiers.length === selectedSystemKeyModifiers.length) {
                if (keyToModifiers(e.key).includes(keyModifiers[0])) return false;
            }
        }
        return true;
    }
    function keyToModifiers(key) {
        if (!key) return [];
        key = kebabCase2(key);
        let modifierToKeyMap = {
            ctrl: "control",
            slash: "/",
            space: " ",
            spacebar: " ",
            cmd: "meta",
            esc: "escape",
            up: "arrow-up",
            down: "arrow-down",
            left: "arrow-left",
            right: "arrow-right",
            period: ".",
            equal: "=",
            minus: "-",
            underscore: "_"
        };
        modifierToKeyMap[key] = key;
        return Object.keys(modifierToKeyMap).map(modifier => {
            if (modifierToKeyMap[modifier] === key) return modifier;
        }).filter(modifier => modifier);
    }

    // packages/alpinejs/src/directives/x-model.js
    directive("model", (el, {
        modifiers,
        expression
    }, {
                            effect: effect3,
                            cleanup: cleanup2
                        }) => {
        let scopeTarget = el;
        if (modifiers.includes("parent")) {
            scopeTarget = el.parentNode;
        }
        let evaluateGet = evaluateLater(scopeTarget, expression);
        let evaluateSet;
        if (typeof expression === "string") {
            evaluateSet = evaluateLater(scopeTarget, `${expression} = __placeholder`);
        } else if (typeof expression === "function" && typeof expression() === "string") {
            evaluateSet = evaluateLater(scopeTarget, `${expression()} = __placeholder`);
        } else {
            evaluateSet = () => {};
        }
        let getValue = () => {
            let result;
            evaluateGet(value => result = value);
            return isGetterSetter(result) ? result.get() : result;
        };
        let setValue = value => {
            let result;
            evaluateGet(value2 => result = value2);
            if (isGetterSetter(result)) {
                result.set(value);
            } else {
                evaluateSet(() => {}, {
                    scope: {
                        __placeholder: value
                    }
                });
            }
        };
        if (typeof expression === "string" && el.type === "radio") {
            mutateDom(() => {
                if (!el.hasAttribute("name")) el.setAttribute("name", expression);
            });
        }
        var event = el.tagName.toLowerCase() === "select" || ["checkbox", "radio"].includes(el.type) || modifiers.includes("lazy") ? "change" : "input";
        let removeListener = isCloning ? () => {} : on(el, event, modifiers, e => {
            setValue(getInputValue(el, modifiers, e, getValue()));
        });
        if (modifiers.includes("fill") && [null, ""].includes(getValue())) {
            el.dispatchEvent(new Event(event, {}));
        }
        if (!el._x_removeModelListeners) el._x_removeModelListeners = {};
        el._x_removeModelListeners["default"] = removeListener;
        cleanup2(() => el._x_removeModelListeners["default"]());
        if (el.form) {
            let removeResetListener = on(el.form, "reset", [], e => {
                nextTick(() => el._x_model && el._x_model.set(el.value));
            });
            cleanup2(() => removeResetListener());
        }
        el._x_model = {
            get() {
                return getValue();
            },
            set(value) {
                setValue(value);
            }
        };
        el._x_forceModelUpdate = value => {
            value = value === void 0 ? getValue() : value;
            if (value === void 0 && typeof expression === "string" && expression.match(/\./)) value = "";
            window.fromModel = true;
            mutateDom(() => bind$1(el, "value", value));
            delete window.fromModel;
        };
        effect3(() => {
            let value = getValue();
            if (modifiers.includes("unintrusive") && document.activeElement.isSameNode(el)) return;
            el._x_forceModelUpdate(value);
        });
    });
    function getInputValue(el, modifiers, event, currentValue) {
        return mutateDom(() => {
            if (event instanceof CustomEvent && event.detail !== void 0) return event.detail ?? event.target.value;else if (el.type === "checkbox") {
                if (Array.isArray(currentValue)) {
                    let newValue = modifiers.includes("number") ? safeParseNumber(event.target.value) : event.target.value;
                    return event.target.checked ? currentValue.concat([newValue]) : currentValue.filter(el2 => !checkedAttrLooseCompare2(el2, newValue));
                } else {
                    return event.target.checked;
                }
            } else if (el.tagName.toLowerCase() === "select" && el.multiple) {
                return modifiers.includes("number") ? Array.from(event.target.selectedOptions).map(option => {
                    let rawValue = option.value || option.text;
                    return safeParseNumber(rawValue);
                }) : Array.from(event.target.selectedOptions).map(option => {
                    return option.value || option.text;
                });
            } else {
                let rawValue = event.target.value;
                return modifiers.includes("number") ? safeParseNumber(rawValue) : modifiers.includes("trim") ? rawValue.trim() : rawValue;
            }
        });
    }
    function safeParseNumber(rawValue) {
        let number = rawValue ? parseFloat(rawValue) : null;
        return isNumeric2(number) ? number : rawValue;
    }
    function checkedAttrLooseCompare2(valueA, valueB) {
        return valueA == valueB;
    }
    function isNumeric2(subject) {
        return !Array.isArray(subject) && !isNaN(subject);
    }
    function isGetterSetter(value) {
        return value !== null && typeof value === "object" && typeof value.get === "function" && typeof value.set === "function";
    }

    // packages/alpinejs/src/directives/x-cloak.js
    directive("cloak", el => queueMicrotask(() => mutateDom(() => el.removeAttribute(prefix("cloak")))));

    // packages/alpinejs/src/directives/x-init.js
    addInitSelector(() => `[${prefix("init")}]`);
    directive("init", skipDuringClone((el, {
        expression
    }, {
                                           evaluate: evaluate2
                                       }) => {
        if (typeof expression === "string") {
            return !!expression.trim() && evaluate2(expression, {}, false);
        }
        return evaluate2(expression, {}, false);
    }));

    // packages/alpinejs/src/directives/x-text.js
    directive("text", (el, {
        expression
    }, {
                           effect: effect3,
                           evaluateLater: evaluateLater2
                       }) => {
        let evaluate2 = evaluateLater2(expression);
        effect3(() => {
            evaluate2(value => {
                mutateDom(() => {
                    el.textContent = value;
                });
            });
        });
    });

    // packages/alpinejs/src/directives/x-html.js
    directive("html", (el, {
        expression
    }, {
                           effect: effect3,
                           evaluateLater: evaluateLater2
                       }) => {
        let evaluate2 = evaluateLater2(expression);
        effect3(() => {
            evaluate2(value => {
                mutateDom(() => {
                    el.innerHTML = value;
                    el._x_ignoreSelf = true;
                    initTree(el);
                    delete el._x_ignoreSelf;
                });
            });
        });
    });

    // packages/alpinejs/src/directives/x-bind.js
    mapAttributes(startingWith(":", into(prefix("bind:"))));
    var handler2 = (el, {
        value,
        modifiers,
        expression,
        original
    }, {
                        effect: effect3
                    }) => {
        if (!value) {
            let bindingProviders = {};
            injectBindingProviders(bindingProviders);
            let getBindings = evaluateLater(el, expression);
            getBindings(bindings => {
                applyBindingsObject(el, bindings, original);
            }, {
                scope: bindingProviders
            });
            return;
        }
        if (value === "key") return storeKeyForXFor(el, expression);
        if (el._x_inlineBindings && el._x_inlineBindings[value] && el._x_inlineBindings[value].extract) {
            return;
        }
        let evaluate2 = evaluateLater(el, expression);
        effect3(() => evaluate2(result => {
            if (result === void 0 && typeof expression === "string" && expression.match(/\./)) {
                result = "";
            }
            mutateDom(() => bind$1(el, value, result, modifiers));
        }));
    };
    handler2.inline = (el, {
        value,
        modifiers,
        expression
    }) => {
        if (!value) return;
        if (!el._x_inlineBindings) el._x_inlineBindings = {};
        el._x_inlineBindings[value] = {
            expression,
            extract: false
        };
    };
    directive("bind", handler2);
    function storeKeyForXFor(el, expression) {
        el._x_keyExpression = expression;
    }

    // packages/alpinejs/src/directives/x-data.js
    addRootSelector(() => `[${prefix("data")}]`);
    directive("data", skipDuringClone((el, {
        expression
    }, {
                                           cleanup: cleanup2
                                       }) => {
        expression = expression === "" ? "{}" : expression;
        let magicContext = {};
        injectMagics(magicContext, el);
        let dataProviderContext = {};
        injectDataProviders(dataProviderContext, magicContext);
        let data2 = evaluate(el, expression, {
            scope: dataProviderContext
        });
        if (data2 === void 0 || data2 === true) data2 = {};
        injectMagics(data2, el);
        let reactiveData = reactive(data2);
        initInterceptors(reactiveData);
        let undo = addScopeToNode(el, reactiveData);
        reactiveData["init"] && evaluate(el, reactiveData["init"]);
        cleanup2(() => {
            reactiveData["destroy"] && evaluate(el, reactiveData["destroy"]);
            undo();
        });
    }));

    // packages/alpinejs/src/directives/x-show.js
    directive("show", (el, {
        modifiers,
        expression
    }, {
                           effect: effect3
                       }) => {
        let evaluate2 = evaluateLater(el, expression);
        if (!el._x_doHide) el._x_doHide = () => {
            mutateDom(() => {
                el.style.setProperty("display", "none", modifiers.includes("important") ? "important" : void 0);
            });
        };
        if (!el._x_doShow) el._x_doShow = () => {
            mutateDom(() => {
                if (el.style.length === 1 && el.style.display === "none") {
                    el.removeAttribute("style");
                } else {
                    el.style.removeProperty("display");
                }
            });
        };
        let hide = () => {
            el._x_doHide();
            el._x_isShown = false;
        };
        let show = () => {
            el._x_doShow();
            el._x_isShown = true;
        };
        let clickAwayCompatibleShow = () => setTimeout(show);
        let toggle = once(value => value ? show() : hide(), value => {
            if (typeof el._x_toggleAndCascadeWithTransitions === "function") {
                el._x_toggleAndCascadeWithTransitions(el, value, show, hide);
            } else {
                value ? clickAwayCompatibleShow() : hide();
            }
        });
        let oldValue;
        let firstTime = true;
        effect3(() => evaluate2(value => {
            if (!firstTime && value === oldValue) return;
            if (modifiers.includes("immediate")) value ? clickAwayCompatibleShow() : hide();
            toggle(value);
            oldValue = value;
            firstTime = false;
        }));
    });

    // packages/alpinejs/src/directives/x-for.js
    directive("for", (el, {
        expression
    }, {
                          effect: effect3,
                          cleanup: cleanup2
                      }) => {
        let iteratorNames = parseForExpression(expression);
        let evaluateItems = evaluateLater(el, iteratorNames.items);
        let evaluateKey = evaluateLater(el, el._x_keyExpression || "index");
        el._x_prevKeys = [];
        el._x_lookup = {};
        effect3(() => loop(el, iteratorNames, evaluateItems, evaluateKey));
        cleanup2(() => {
            Object.values(el._x_lookup).forEach(el2 => el2.remove());
            delete el._x_prevKeys;
            delete el._x_lookup;
        });
    });
    function loop(el, iteratorNames, evaluateItems, evaluateKey) {
        let isObject2 = i => typeof i === "object" && !Array.isArray(i);
        let templateEl = el;
        evaluateItems(items => {
            if (isNumeric3(items) && items >= 0) {
                items = Array.from(Array(items).keys(), i => i + 1);
            }
            if (items === void 0) items = [];
            let lookup = el._x_lookup;
            let prevKeys = el._x_prevKeys;
            let scopes = [];
            let keys = [];
            if (isObject2(items)) {
                items = Object.entries(items).map(([key, value]) => {
                    let scope2 = getIterationScopeVariables(iteratorNames, value, key, items);
                    evaluateKey(value2 => keys.push(value2), {
                        scope: {
                            index: key,
                            ...scope2
                        }
                    });
                    scopes.push(scope2);
                });
            } else {
                for (let i = 0; i < items.length; i++) {
                    let scope2 = getIterationScopeVariables(iteratorNames, items[i], i, items);
                    evaluateKey(value => keys.push(value), {
                        scope: {
                            index: i,
                            ...scope2
                        }
                    });
                    scopes.push(scope2);
                }
            }
            let adds = [];
            let moves = [];
            let removes = [];
            let sames = [];
            for (let i = 0; i < prevKeys.length; i++) {
                let key = prevKeys[i];
                if (keys.indexOf(key) === -1) removes.push(key);
            }
            prevKeys = prevKeys.filter(key => !removes.includes(key));
            let lastKey = "template";
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let prevIndex = prevKeys.indexOf(key);
                if (prevIndex === -1) {
                    prevKeys.splice(i, 0, key);
                    adds.push([lastKey, i]);
                } else if (prevIndex !== i) {
                    let keyInSpot = prevKeys.splice(i, 1)[0];
                    let keyForSpot = prevKeys.splice(prevIndex - 1, 1)[0];
                    prevKeys.splice(i, 0, keyForSpot);
                    prevKeys.splice(prevIndex, 0, keyInSpot);
                    moves.push([keyInSpot, keyForSpot]);
                } else {
                    sames.push(key);
                }
                lastKey = key;
            }
            for (let i = 0; i < removes.length; i++) {
                let key = removes[i];
                if (!!lookup[key]._x_effects) {
                    lookup[key]._x_effects.forEach(dequeueJob);
                }
                lookup[key].remove();
                lookup[key] = null;
                delete lookup[key];
            }
            for (let i = 0; i < moves.length; i++) {
                let [keyInSpot, keyForSpot] = moves[i];
                let elInSpot = lookup[keyInSpot];
                let elForSpot = lookup[keyForSpot];
                let marker = document.createElement("div");
                mutateDom(() => {
                    if (!elForSpot) warn(`x-for ":key" is undefined or invalid`, templateEl);
                    elForSpot.after(marker);
                    elInSpot.after(elForSpot);
                    elForSpot._x_currentIfEl && elForSpot.after(elForSpot._x_currentIfEl);
                    marker.before(elInSpot);
                    elInSpot._x_currentIfEl && elInSpot.after(elInSpot._x_currentIfEl);
                    marker.remove();
                });
                elForSpot._x_refreshXForScope(scopes[keys.indexOf(keyForSpot)]);
            }
            for (let i = 0; i < adds.length; i++) {
                let [lastKey2, index] = adds[i];
                let lastEl = lastKey2 === "template" ? templateEl : lookup[lastKey2];
                if (lastEl._x_currentIfEl) lastEl = lastEl._x_currentIfEl;
                let scope2 = scopes[index];
                let key = keys[index];
                let clone2 = document.importNode(templateEl.content, true).firstElementChild;
                let reactiveScope = reactive(scope2);
                addScopeToNode(clone2, reactiveScope, templateEl);
                clone2._x_refreshXForScope = newScope => {
                    Object.entries(newScope).forEach(([key2, value]) => {
                        reactiveScope[key2] = value;
                    });
                };
                mutateDom(() => {
                    lastEl.after(clone2);
                    initTree(clone2);
                });
                if (typeof key === "object") {
                    warn("x-for key cannot be an object, it must be a string or an integer", templateEl);
                }
                lookup[key] = clone2;
            }
            for (let i = 0; i < sames.length; i++) {
                lookup[sames[i]]._x_refreshXForScope(scopes[keys.indexOf(sames[i])]);
            }
            templateEl._x_prevKeys = keys;
        });
    }
    function parseForExpression(expression) {
        let forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
        let stripParensRE = /^\s*\(|\)\s*$/g;
        let forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
        let inMatch = expression.match(forAliasRE);
        if (!inMatch) return;
        let res = {};
        res.items = inMatch[2].trim();
        let item = inMatch[1].replace(stripParensRE, "").trim();
        let iteratorMatch = item.match(forIteratorRE);
        if (iteratorMatch) {
            res.item = item.replace(forIteratorRE, "").trim();
            res.index = iteratorMatch[1].trim();
            if (iteratorMatch[2]) {
                res.collection = iteratorMatch[2].trim();
            }
        } else {
            res.item = item;
        }
        return res;
    }
    function getIterationScopeVariables(iteratorNames, item, index, items) {
        let scopeVariables = {};
        if (/^\[.*\]$/.test(iteratorNames.item) && Array.isArray(item)) {
            let names = iteratorNames.item.replace("[", "").replace("]", "").split(",").map(i => i.trim());
            names.forEach((name, i) => {
                scopeVariables[name] = item[i];
            });
        } else if (/^\{.*\}$/.test(iteratorNames.item) && !Array.isArray(item) && typeof item === "object") {
            let names = iteratorNames.item.replace("{", "").replace("}", "").split(",").map(i => i.trim());
            names.forEach(name => {
                scopeVariables[name] = item[name];
            });
        } else {
            scopeVariables[iteratorNames.item] = item;
        }
        if (iteratorNames.index) scopeVariables[iteratorNames.index] = index;
        if (iteratorNames.collection) scopeVariables[iteratorNames.collection] = items;
        return scopeVariables;
    }
    function isNumeric3(subject) {
        return !Array.isArray(subject) && !isNaN(subject);
    }

    // packages/alpinejs/src/directives/x-ref.js
    function handler3() {}
    handler3.inline = (el, {
        expression
    }, {
                           cleanup: cleanup2
                       }) => {
        let root = closestRoot(el);
        if (!root._x_refs) root._x_refs = {};
        root._x_refs[expression] = el;
        cleanup2(() => delete root._x_refs[expression]);
    };
    directive("ref", handler3);

    // packages/alpinejs/src/directives/x-if.js
    directive("if", (el, {
        expression
    }, {
                         effect: effect3,
                         cleanup: cleanup2
                     }) => {
        let evaluate2 = evaluateLater(el, expression);
        let show = () => {
            if (el._x_currentIfEl) return el._x_currentIfEl;
            let clone2 = el.content.cloneNode(true).firstElementChild;
            addScopeToNode(clone2, {}, el);
            mutateDom(() => {
                el.after(clone2);
                initTree(clone2);
            });
            el._x_currentIfEl = clone2;
            el._x_undoIf = () => {
                walk(clone2, node => {
                    if (!!node._x_effects) {
                        node._x_effects.forEach(dequeueJob);
                    }
                });
                clone2.remove();
                delete el._x_currentIfEl;
            };
            return clone2;
        };
        let hide = () => {
            if (!el._x_undoIf) return;
            el._x_undoIf();
            delete el._x_undoIf;
        };
        effect3(() => evaluate2(value => {
            value ? show() : hide();
        }));
        cleanup2(() => el._x_undoIf && el._x_undoIf());
    });

    // packages/alpinejs/src/directives/x-id.js
    directive("id", (el, {
        expression
    }, {
                         evaluate: evaluate2
                     }) => {
        let names = evaluate2(expression);
        names.forEach(name => setIdRoot(el, name));
    });

    // packages/alpinejs/src/directives/x-on.js
    mapAttributes(startingWith("@", into(prefix("on:"))));
    directive("on", skipDuringClone((el, {
        value,
        modifiers,
        expression
    }, {
                                         cleanup: cleanup2
                                     }) => {
        let evaluate2 = expression ? evaluateLater(el, expression) : () => {};
        if (el.tagName.toLowerCase() === "template") {
            if (!el._x_forwardEvents) el._x_forwardEvents = [];
            if (!el._x_forwardEvents.includes(value)) el._x_forwardEvents.push(value);
        }
        let removeListener = on(el, value, modifiers, e => {
            evaluate2(() => {}, {
                scope: {
                    $event: e
                },
                params: [e]
            });
        });
        cleanup2(() => removeListener());
    }));

    // packages/alpinejs/src/directives/index.js
    warnMissingPluginDirective("Collapse", "collapse", "collapse");
    warnMissingPluginDirective("Intersect", "intersect", "intersect");
    warnMissingPluginDirective("Focus", "trap", "focus");
    warnMissingPluginDirective("Mask", "mask", "mask");
    function warnMissingPluginDirective(name, directiveName2, slug) {
        directive(directiveName2, el => warn(`You can't use [x-${directiveName2}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
    }

    // packages/alpinejs/src/index.js
    alpine_default.setEvaluator(normalEvaluator);
    alpine_default.setReactivityEngine({
        reactive: reactive2,
        effect: effect2,
        release: stop,
        raw: toRaw
    });
    var src_default = alpine_default;

    // packages/alpinejs/builds/module.js
    var module_default = src_default;

    function bind(fn, thisArg) {
        return function wrap() {
            return fn.apply(thisArg, arguments);
        };
    }

    // utils is a library of generic helper functions non-specific to axios

    const {
        toString
    } = Object.prototype;
    const {
        getPrototypeOf
    } = Object;
    const kindOf = (cache => thing => {
        const str = toString.call(thing);
        return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
    })(Object.create(null));
    const kindOfTest = type => {
        type = type.toLowerCase();
        return thing => kindOf(thing) === type;
    };
    const typeOfTest = type => thing => typeof thing === type;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     *
     * @returns {boolean} True if value is an Array, otherwise false
     */
    const {
        isArray
    } = Array;

    /**
     * Determine if a value is undefined
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    const isUndefined = typeOfTest('undefined');

    /**
     * Determine if a value is a Buffer
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
        return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    const isArrayBuffer = kindOfTest('ArrayBuffer');

    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
        let result;
        if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
            result = ArrayBuffer.isView(val);
        } else {
            result = val && val.buffer && isArrayBuffer(val.buffer);
        }
        return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a String, otherwise false
     */
    const isString = typeOfTest('string');

    /**
     * Determine if a value is a Function
     *
     * @param {*} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    const isFunction = typeOfTest('function');

    /**
     * Determine if a value is a Number
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Number, otherwise false
     */
    const isNumber = typeOfTest('number');

    /**
     * Determine if a value is an Object
     *
     * @param {*} thing The value to test
     *
     * @returns {boolean} True if value is an Object, otherwise false
     */
    const isObject = thing => thing !== null && typeof thing === 'object';

    /**
     * Determine if a value is a Boolean
     *
     * @param {*} thing The value to test
     * @returns {boolean} True if value is a Boolean, otherwise false
     */
    const isBoolean = thing => thing === true || thing === false;

    /**
     * Determine if a value is a plain Object
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a plain Object, otherwise false
     */
    const isPlainObject = val => {
        if (kindOf(val) !== 'object') {
            return false;
        }
        const prototype = getPrototypeOf(val);
        return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
    };

    /**
     * Determine if a value is a Date
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Date, otherwise false
     */
    const isDate = kindOfTest('Date');

    /**
     * Determine if a value is a File
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a File, otherwise false
     */
    const isFile = kindOfTest('File');

    /**
     * Determine if a value is a Blob
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    const isBlob = kindOfTest('Blob');

    /**
     * Determine if a value is a FileList
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a File, otherwise false
     */
    const isFileList = kindOfTest('FileList');

    /**
     * Determine if a value is a Stream
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    const isStream = val => isObject(val) && isFunction(val.pipe);

    /**
     * Determine if a value is a FormData
     *
     * @param {*} thing The value to test
     *
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    const isFormData = thing => {
        let kind;
        return thing && (typeof FormData === 'function' && thing instanceof FormData || isFunction(thing.append) && ((kind = kindOf(thing)) === 'formdata' ||
            // detect form-data instance
            kind === 'object' && isFunction(thing.toString) && thing.toString() === '[object FormData]'));
    };

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    const isURLSearchParams = kindOfTest('URLSearchParams');

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     *
     * @returns {String} The String freed of excess whitespace
     */
    const trim = str => str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     *
     * @param {Boolean} [allOwnKeys = false]
     * @returns {any}
     */
    function forEach(obj, fn, {
        allOwnKeys = false
    } = {}) {
        // Don't bother if no value provided
        if (obj === null || typeof obj === 'undefined') {
            return;
        }
        let i;
        let l;

        // Force an array if not already something iterable
        if (typeof obj !== 'object') {
            /*eslint no-param-reassign:0*/
            obj = [obj];
        }
        if (isArray(obj)) {
            // Iterate over array values
            for (i = 0, l = obj.length; i < l; i++) {
                fn.call(null, obj[i], i, obj);
            }
        } else {
            // Iterate over object keys
            const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
            const len = keys.length;
            let key;
            for (i = 0; i < len; i++) {
                key = keys[i];
                fn.call(null, obj[key], key, obj);
            }
        }
    }
    function findKey(obj, key) {
        key = key.toLowerCase();
        const keys = Object.keys(obj);
        let i = keys.length;
        let _key;
        while (i-- > 0) {
            _key = keys[i];
            if (key === _key.toLowerCase()) {
                return _key;
            }
        }
        return null;
    }
    const _global = (() => {
        /*eslint no-undef:0*/
        if (typeof globalThis !== "undefined") return globalThis;
        return typeof self !== "undefined" ? self : typeof window !== 'undefined' ? window : global;
    })();
    const isContextDefined = context => !isUndefined(context) && context !== _global;

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     *
     * @returns {Object} Result of all merge properties
     */
    function merge( /* obj1, obj2, obj3, ... */
    ) {
        const {
            caseless
        } = isContextDefined(this) && this || {};
        const result = {};
        const assignValue = (val, key) => {
            const targetKey = caseless && findKey(result, key) || key;
            if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
                result[targetKey] = merge(result[targetKey], val);
            } else if (isPlainObject(val)) {
                result[targetKey] = merge({}, val);
            } else if (isArray(val)) {
                result[targetKey] = val.slice();
            } else {
                result[targetKey] = val;
            }
        };
        for (let i = 0, l = arguments.length; i < l; i++) {
            arguments[i] && forEach(arguments[i], assignValue);
        }
        return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     *
     * @param {Boolean} [allOwnKeys]
     * @returns {Object} The resulting value of object a
     */
    const extend = (a, b, thisArg, {
        allOwnKeys
    } = {}) => {
        forEach(b, (val, key) => {
            if (thisArg && isFunction(val)) {
                a[key] = bind(val, thisArg);
            } else {
                a[key] = val;
            }
        }, {
            allOwnKeys
        });
        return a;
    };

    /**
     * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
     *
     * @param {string} content with BOM
     *
     * @returns {string} content value without BOM
     */
    const stripBOM = content => {
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }
        return content;
    };

    /**
     * Inherit the prototype methods from one constructor into another
     * @param {function} constructor
     * @param {function} superConstructor
     * @param {object} [props]
     * @param {object} [descriptors]
     *
     * @returns {void}
     */
    const inherits = (constructor, superConstructor, props, descriptors) => {
        constructor.prototype = Object.create(superConstructor.prototype, descriptors);
        constructor.prototype.constructor = constructor;
        Object.defineProperty(constructor, 'super', {
            value: superConstructor.prototype
        });
        props && Object.assign(constructor.prototype, props);
    };

    /**
     * Resolve object with deep prototype chain to a flat object
     * @param {Object} sourceObj source object
     * @param {Object} [destObj]
     * @param {Function|Boolean} [filter]
     * @param {Function} [propFilter]
     *
     * @returns {Object}
     */
    const toFlatObject = (sourceObj, destObj, filter, propFilter) => {
        let props;
        let i;
        let prop;
        const merged = {};
        destObj = destObj || {};
        // eslint-disable-next-line no-eq-null,eqeqeq
        if (sourceObj == null) return destObj;
        do {
            props = Object.getOwnPropertyNames(sourceObj);
            i = props.length;
            while (i-- > 0) {
                prop = props[i];
                if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
                    destObj[prop] = sourceObj[prop];
                    merged[prop] = true;
                }
            }
            sourceObj = filter !== false && getPrototypeOf(sourceObj);
        } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);
        return destObj;
    };

    /**
     * Determines whether a string ends with the characters of a specified string
     *
     * @param {String} str
     * @param {String} searchString
     * @param {Number} [position= 0]
     *
     * @returns {boolean}
     */
    const endsWith = (str, searchString, position) => {
        str = String(str);
        if (position === undefined || position > str.length) {
            position = str.length;
        }
        position -= searchString.length;
        const lastIndex = str.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };

    /**
     * Returns new array from array like object or null if failed
     *
     * @param {*} [thing]
     *
     * @returns {?Array}
     */
    const toArray = thing => {
        if (!thing) return null;
        if (isArray(thing)) return thing;
        let i = thing.length;
        if (!isNumber(i)) return null;
        const arr = new Array(i);
        while (i-- > 0) {
            arr[i] = thing[i];
        }
        return arr;
    };

    /**
     * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
     * thing passed in is an instance of Uint8Array
     *
     * @param {TypedArray}
     *
     * @returns {Array}
     */
        // eslint-disable-next-line func-names
    const isTypedArray = (TypedArray => {
            // eslint-disable-next-line func-names
            return thing => {
                return TypedArray && thing instanceof TypedArray;
            };
        })(typeof Uint8Array !== 'undefined' && getPrototypeOf(Uint8Array));

    /**
     * For each entry in the object, call the function with the key and value.
     *
     * @param {Object<any, any>} obj - The object to iterate over.
     * @param {Function} fn - The function to call for each entry.
     *
     * @returns {void}
     */
    const forEachEntry = (obj, fn) => {
        const generator = obj && obj[Symbol.iterator];
        const iterator = generator.call(obj);
        let result;
        while ((result = iterator.next()) && !result.done) {
            const pair = result.value;
            fn.call(obj, pair[0], pair[1]);
        }
    };

    /**
     * It takes a regular expression and a string, and returns an array of all the matches
     *
     * @param {string} regExp - The regular expression to match against.
     * @param {string} str - The string to search.
     *
     * @returns {Array<boolean>}
     */
    const matchAll = (regExp, str) => {
        let matches;
        const arr = [];
        while ((matches = regExp.exec(str)) !== null) {
            arr.push(matches);
        }
        return arr;
    };

    /* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */
    const isHTMLForm = kindOfTest('HTMLFormElement');
    const toCamelCase = str => {
        return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
            return p1.toUpperCase() + p2;
        });
    };

    /* Creating a function that will check if an object has a property. */
    const hasOwnProperty = (({
                                 hasOwnProperty
                             }) => (obj, prop) => hasOwnProperty.call(obj, prop))(Object.prototype);

    /**
     * Determine if a value is a RegExp object
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a RegExp object, otherwise false
     */
    const isRegExp = kindOfTest('RegExp');
    const reduceDescriptors = (obj, reducer) => {
        const descriptors = Object.getOwnPropertyDescriptors(obj);
        const reducedDescriptors = {};
        forEach(descriptors, (descriptor, name) => {
            if (reducer(descriptor, name, obj) !== false) {
                reducedDescriptors[name] = descriptor;
            }
        });
        Object.defineProperties(obj, reducedDescriptors);
    };

    /**
     * Makes all methods read-only
     * @param {Object} obj
     */

    const freezeMethods = obj => {
        reduceDescriptors(obj, (descriptor, name) => {
            // skip restricted props in strict mode
            if (isFunction(obj) && ['arguments', 'caller', 'callee'].indexOf(name) !== -1) {
                return false;
            }
            const value = obj[name];
            if (!isFunction(value)) return;
            descriptor.enumerable = false;
            if ('writable' in descriptor) {
                descriptor.writable = false;
                return;
            }
            if (!descriptor.set) {
                descriptor.set = () => {
                    throw Error('Can not rewrite read-only method \'' + name + '\'');
                };
            }
        });
    };
    const toObjectSet = (arrayOrString, delimiter) => {
        const obj = {};
        const define = arr => {
            arr.forEach(value => {
                obj[value] = true;
            });
        };
        isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
        return obj;
    };
    const noop = () => {};
    const toFiniteNumber = (value, defaultValue) => {
        value = +value;
        return Number.isFinite(value) ? value : defaultValue;
    };
    const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
    const DIGIT = '0123456789';
    const ALPHABET = {
        DIGIT,
        ALPHA,
        ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
    };
    const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
        let str = '';
        const {
            length
        } = alphabet;
        while (size--) {
            str += alphabet[Math.random() * length | 0];
        }
        return str;
    };

    /**
     * If the thing is a FormData object, return true, otherwise return false.
     *
     * @param {unknown} thing - The thing to check.
     *
     * @returns {boolean}
     */
    function isSpecCompliantForm(thing) {
        return !!(thing && isFunction(thing.append) && thing[Symbol.toStringTag] === 'FormData' && thing[Symbol.iterator]);
    }
    const toJSONObject = obj => {
        const stack = new Array(10);
        const visit = (source, i) => {
            if (isObject(source)) {
                if (stack.indexOf(source) >= 0) {
                    return;
                }
                if (!('toJSON' in source)) {
                    stack[i] = source;
                    const target = isArray(source) ? [] : {};
                    forEach(source, (value, key) => {
                        const reducedValue = visit(value, i + 1);
                        !isUndefined(reducedValue) && (target[key] = reducedValue);
                    });
                    stack[i] = undefined;
                    return target;
                }
            }
            return source;
        };
        return visit(obj, 0);
    };
    const isAsyncFn = kindOfTest('AsyncFunction');
    const isThenable = thing => thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);
    var utils = {
        isArray,
        isArrayBuffer,
        isBuffer,
        isFormData,
        isArrayBufferView,
        isString,
        isNumber,
        isBoolean,
        isObject,
        isPlainObject,
        isUndefined,
        isDate,
        isFile,
        isBlob,
        isRegExp,
        isFunction,
        isStream,
        isURLSearchParams,
        isTypedArray,
        isFileList,
        forEach,
        merge,
        extend,
        trim,
        stripBOM,
        inherits,
        toFlatObject,
        kindOf,
        kindOfTest,
        endsWith,
        toArray,
        forEachEntry,
        matchAll,
        isHTMLForm,
        hasOwnProperty,
        hasOwnProp: hasOwnProperty,
        // an alias to avoid ESLint no-prototype-builtins detection
        reduceDescriptors,
        freezeMethods,
        toObjectSet,
        toCamelCase,
        noop,
        toFiniteNumber,
        findKey,
        global: _global,
        isContextDefined,
        ALPHABET,
        generateString,
        isSpecCompliantForm,
        toJSONObject,
        isAsyncFn,
        isThenable
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [config] The config.
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     *
     * @returns {Error} The created error.
     */
    function AxiosError(message, code, config, request, response) {
        Error.call(this);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = new Error().stack;
        }
        this.message = message;
        this.name = 'AxiosError';
        code && (this.code = code);
        config && (this.config = config);
        request && (this.request = request);
        response && (this.response = response);
    }
    utils.inherits(AxiosError, Error, {
        toJSON: function toJSON() {
            return {
                // Standard
                message: this.message,
                name: this.name,
                // Microsoft
                description: this.description,
                number: this.number,
                // Mozilla
                fileName: this.fileName,
                lineNumber: this.lineNumber,
                columnNumber: this.columnNumber,
                stack: this.stack,
                // Axios
                config: utils.toJSONObject(this.config),
                code: this.code,
                status: this.response && this.response.status ? this.response.status : null
            };
        }
    });
    const prototype$1 = AxiosError.prototype;
    const descriptors = {};
    ['ERR_BAD_OPTION_VALUE', 'ERR_BAD_OPTION', 'ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK', 'ERR_FR_TOO_MANY_REDIRECTS', 'ERR_DEPRECATED', 'ERR_BAD_RESPONSE', 'ERR_BAD_REQUEST', 'ERR_CANCELED', 'ERR_NOT_SUPPORT', 'ERR_INVALID_URL'
        // eslint-disable-next-line func-names
    ].forEach(code => {
        descriptors[code] = {
            value: code
        };
    });
    Object.defineProperties(AxiosError, descriptors);
    Object.defineProperty(prototype$1, 'isAxiosError', {
        value: true
    });

    // eslint-disable-next-line func-names
    AxiosError.from = (error, code, config, request, response, customProps) => {
        const axiosError = Object.create(prototype$1);
        utils.toFlatObject(error, axiosError, function filter(obj) {
            return obj !== Error.prototype;
        }, prop => {
            return prop !== 'isAxiosError';
        });
        AxiosError.call(axiosError, error.message, code, config, request, response);
        axiosError.cause = error;
        axiosError.name = error.name;
        customProps && Object.assign(axiosError, customProps);
        return axiosError;
    };

    // eslint-disable-next-line strict
    var httpAdapter = null;

    /**
     * Determines if the given thing is a array or js object.
     *
     * @param {string} thing - The object or array to be visited.
     *
     * @returns {boolean}
     */
    function isVisitable(thing) {
        return utils.isPlainObject(thing) || utils.isArray(thing);
    }

    /**
     * It removes the brackets from the end of a string
     *
     * @param {string} key - The key of the parameter.
     *
     * @returns {string} the key without the brackets.
     */
    function removeBrackets(key) {
        return utils.endsWith(key, '[]') ? key.slice(0, -2) : key;
    }

    /**
     * It takes a path, a key, and a boolean, and returns a string
     *
     * @param {string} path - The path to the current key.
     * @param {string} key - The key of the current object being iterated over.
     * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
     *
     * @returns {string} The path to the current key.
     */
    function renderKey(path, key, dots) {
        if (!path) return key;
        return path.concat(key).map(function each(token, i) {
            // eslint-disable-next-line no-param-reassign
            token = removeBrackets(token);
            return !dots && i ? '[' + token + ']' : token;
        }).join(dots ? '.' : '');
    }

    /**
     * If the array is an array and none of its elements are visitable, then it's a flat array.
     *
     * @param {Array<any>} arr - The array to check
     *
     * @returns {boolean}
     */
    function isFlatArray(arr) {
        return utils.isArray(arr) && !arr.some(isVisitable);
    }
    const predicates = utils.toFlatObject(utils, {}, null, function filter(prop) {
        return /^is[A-Z]/.test(prop);
    });

    /**
     * Convert a data object to FormData
     *
     * @param {Object} obj
     * @param {?Object} [formData]
     * @param {?Object} [options]
     * @param {Function} [options.visitor]
     * @param {Boolean} [options.metaTokens = true]
     * @param {Boolean} [options.dots = false]
     * @param {?Boolean} [options.indexes = false]
     *
     * @returns {Object}
     **/

    /**
     * It converts an object into a FormData object
     *
     * @param {Object<any, any>} obj - The object to convert to form data.
     * @param {string} formData - The FormData object to append to.
     * @param {Object<string, any>} options
     *
     * @returns
     */
    function toFormData(obj, formData, options) {
        if (!utils.isObject(obj)) {
            throw new TypeError('target must be an object');
        }

        // eslint-disable-next-line no-param-reassign
        formData = formData || new (FormData)();

        // eslint-disable-next-line no-param-reassign
        options = utils.toFlatObject(options, {
            metaTokens: true,
            dots: false,
            indexes: false
        }, false, function defined(option, source) {
            // eslint-disable-next-line no-eq-null,eqeqeq
            return !utils.isUndefined(source[option]);
        });
        const metaTokens = options.metaTokens;
        // eslint-disable-next-line no-use-before-define
        const visitor = options.visitor || defaultVisitor;
        const dots = options.dots;
        const indexes = options.indexes;
        const _Blob = options.Blob || typeof Blob !== 'undefined' && Blob;
        const useBlob = _Blob && utils.isSpecCompliantForm(formData);
        if (!utils.isFunction(visitor)) {
            throw new TypeError('visitor must be a function');
        }
        function convertValue(value) {
            if (value === null) return '';
            if (utils.isDate(value)) {
                return value.toISOString();
            }
            if (!useBlob && utils.isBlob(value)) {
                throw new AxiosError('Blob is not supported. Use a Buffer instead.');
            }
            if (utils.isArrayBuffer(value) || utils.isTypedArray(value)) {
                return useBlob && typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
            }
            return value;
        }

        /**
         * Default visitor.
         *
         * @param {*} value
         * @param {String|Number} key
         * @param {Array<String|Number>} path
         * @this {FormData}
         *
         * @returns {boolean} return true to visit the each prop of the value recursively
         */
        function defaultVisitor(value, key, path) {
            let arr = value;
            if (value && !path && typeof value === 'object') {
                if (utils.endsWith(key, '{}')) {
                    // eslint-disable-next-line no-param-reassign
                    key = metaTokens ? key : key.slice(0, -2);
                    // eslint-disable-next-line no-param-reassign
                    value = JSON.stringify(value);
                } else if (utils.isArray(value) && isFlatArray(value) || (utils.isFileList(value) || utils.endsWith(key, '[]')) && (arr = utils.toArray(value))) {
                    // eslint-disable-next-line no-param-reassign
                    key = removeBrackets(key);
                    arr.forEach(function each(el, index) {
                        !(utils.isUndefined(el) || el === null) && formData.append(
                            // eslint-disable-next-line no-nested-ternary
                            indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + '[]', convertValue(el));
                    });
                    return false;
                }
            }
            if (isVisitable(value)) {
                return true;
            }
            formData.append(renderKey(path, key, dots), convertValue(value));
            return false;
        }
        const stack = [];
        const exposedHelpers = Object.assign(predicates, {
            defaultVisitor,
            convertValue,
            isVisitable
        });
        function build(value, path) {
            if (utils.isUndefined(value)) return;
            if (stack.indexOf(value) !== -1) {
                throw Error('Circular reference detected in ' + path.join('.'));
            }
            stack.push(value);
            utils.forEach(value, function each(el, key) {
                const result = !(utils.isUndefined(el) || el === null) && visitor.call(formData, el, utils.isString(key) ? key.trim() : key, path, exposedHelpers);
                if (result === true) {
                    build(el, path ? path.concat(key) : [key]);
                }
            });
            stack.pop();
        }
        if (!utils.isObject(obj)) {
            throw new TypeError('data must be an object');
        }
        build(obj);
        return formData;
    }

    /**
     * It encodes a string by replacing all characters that are not in the unreserved set with
     * their percent-encoded equivalents
     *
     * @param {string} str - The string to encode.
     *
     * @returns {string} The encoded string.
     */
    function encode$1(str) {
        const charMap = {
            '!': '%21',
            "'": '%27',
            '(': '%28',
            ')': '%29',
            '~': '%7E',
            '%20': '+',
            '%00': '\x00'
        };
        return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
            return charMap[match];
        });
    }

    /**
     * It takes a params object and converts it to a FormData object
     *
     * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
     * @param {Object<string, any>} options - The options object passed to the Axios constructor.
     *
     * @returns {void}
     */
    function AxiosURLSearchParams(params, options) {
        this._pairs = [];
        params && toFormData(params, this, options);
    }
    const prototype = AxiosURLSearchParams.prototype;
    prototype.append = function append(name, value) {
        this._pairs.push([name, value]);
    };
    prototype.toString = function toString(encoder) {
        const _encode = encoder ? function (value) {
            return encoder.call(this, value, encode$1);
        } : encode$1;
        return this._pairs.map(function each(pair) {
            return _encode(pair[0]) + '=' + _encode(pair[1]);
        }, '').join('&');
    };

    /**
     * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
     * URI encoded counterparts
     *
     * @param {string} val The value to be encoded.
     *
     * @returns {string} The encoded value.
     */
    function encode(val) {
        return encodeURIComponent(val).replace(/%3A/gi, ':').replace(/%24/g, '$').replace(/%2C/gi, ',').replace(/%20/g, '+').replace(/%5B/gi, '[').replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @param {?object} options
     *
     * @returns {string} The formatted url
     */
    function buildURL(url, params, options) {
        /*eslint no-param-reassign:0*/
        if (!params) {
            return url;
        }
        const _encode = options && options.encode || encode;
        const serializeFn = options && options.serialize;
        let serializedParams;
        if (serializeFn) {
            serializedParams = serializeFn(params, options);
        } else {
            serializedParams = utils.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams(params, options).toString(_encode);
        }
        if (serializedParams) {
            const hashmarkIndex = url.indexOf("#");
            if (hashmarkIndex !== -1) {
                url = url.slice(0, hashmarkIndex);
            }
            url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
        }
        return url;
    }

    class InterceptorManager {
        constructor() {
            this.handlers = [];
        }

        /**
         * Add a new interceptor to the stack
         *
         * @param {Function} fulfilled The function to handle `then` for a `Promise`
         * @param {Function} rejected The function to handle `reject` for a `Promise`
         *
         * @return {Number} An ID used to remove interceptor later
         */
        use(fulfilled, rejected, options) {
            this.handlers.push({
                fulfilled,
                rejected,
                synchronous: options ? options.synchronous : false,
                runWhen: options ? options.runWhen : null
            });
            return this.handlers.length - 1;
        }

        /**
         * Remove an interceptor from the stack
         *
         * @param {Number} id The ID that was returned by `use`
         *
         * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
         */
        eject(id) {
            if (this.handlers[id]) {
                this.handlers[id] = null;
            }
        }

        /**
         * Clear all interceptors from the stack
         *
         * @returns {void}
         */
        clear() {
            if (this.handlers) {
                this.handlers = [];
            }
        }

        /**
         * Iterate over all the registered interceptors
         *
         * This method is particularly useful for skipping over any
         * interceptors that may have become `null` calling `eject`.
         *
         * @param {Function} fn The function to call for each interceptor
         *
         * @returns {void}
         */
        forEach(fn) {
            utils.forEach(this.handlers, function forEachHandler(h) {
                if (h !== null) {
                    fn(h);
                }
            });
        }
    }
    var InterceptorManager$1 = InterceptorManager;

    var transitionalDefaults = {
        silentJSONParsing: true,
        forcedJSONParsing: true,
        clarifyTimeoutError: false
    };

    var URLSearchParams$1 = typeof URLSearchParams !== 'undefined' ? URLSearchParams : AxiosURLSearchParams;

    var FormData$1 = typeof FormData !== 'undefined' ? FormData : null;

    var Blob$1 = typeof Blob !== 'undefined' ? Blob : null;

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     *
     * @returns {boolean}
     */
    const isStandardBrowserEnv = (() => {
        let product;
        if (typeof navigator !== 'undefined' && ((product = navigator.product) === 'ReactNative' || product === 'NativeScript' || product === 'NS')) {
            return false;
        }
        return typeof window !== 'undefined' && typeof document !== 'undefined';
    })();

    /**
     * Determine if we're running in a standard browser webWorker environment
     *
     * Although the `isStandardBrowserEnv` method indicates that
     * `allows axios to run in a web worker`, the WebWorker will still be
     * filtered out due to its judgment standard
     * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
     * This leads to a problem when axios post `FormData` in webWorker
     */
    const isStandardBrowserWebWorkerEnv = (() => {
        return typeof WorkerGlobalScope !== 'undefined' &&
            // eslint-disable-next-line no-undef
            self instanceof WorkerGlobalScope && typeof self.importScripts === 'function';
    })();
    var platform = {
        isBrowser: true,
        classes: {
            URLSearchParams: URLSearchParams$1,
            FormData: FormData$1,
            Blob: Blob$1
        },
        isStandardBrowserEnv,
        isStandardBrowserWebWorkerEnv,
        protocols: ['http', 'https', 'file', 'blob', 'url', 'data']
    };

    function toURLEncodedForm(data, options) {
        return toFormData(data, new platform.classes.URLSearchParams(), Object.assign({
            visitor: function (value, key, path, helpers) {
                if (platform.isNode && utils.isBuffer(value)) {
                    this.append(key, value.toString('base64'));
                    return false;
                }
                return helpers.defaultVisitor.apply(this, arguments);
            }
        }, options));
    }

    /**
     * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
     *
     * @param {string} name - The name of the property to get.
     *
     * @returns An array of strings.
     */
    function parsePropPath(name) {
        // foo[x][y][z]
        // foo.x.y.z
        // foo-x-y-z
        // foo x y z
        return utils.matchAll(/\w+|\[(\w*)]/g, name).map(match => {
            return match[0] === '[]' ? '' : match[1] || match[0];
        });
    }

    /**
     * Convert an array to an object.
     *
     * @param {Array<any>} arr - The array to convert to an object.
     *
     * @returns An object with the same keys and values as the array.
     */
    function arrayToObject(arr) {
        const obj = {};
        const keys = Object.keys(arr);
        let i;
        const len = keys.length;
        let key;
        for (i = 0; i < len; i++) {
            key = keys[i];
            obj[key] = arr[key];
        }
        return obj;
    }

    /**
     * It takes a FormData object and returns a JavaScript object
     *
     * @param {string} formData The FormData object to convert to JSON.
     *
     * @returns {Object<string, any> | null} The converted object.
     */
    function formDataToJSON(formData) {
        function buildPath(path, value, target, index) {
            let name = path[index++];
            const isNumericKey = Number.isFinite(+name);
            const isLast = index >= path.length;
            name = !name && utils.isArray(target) ? target.length : name;
            if (isLast) {
                if (utils.hasOwnProp(target, name)) {
                    target[name] = [target[name], value];
                } else {
                    target[name] = value;
                }
                return !isNumericKey;
            }
            if (!target[name] || !utils.isObject(target[name])) {
                target[name] = [];
            }
            const result = buildPath(path, value, target[name], index);
            if (result && utils.isArray(target[name])) {
                target[name] = arrayToObject(target[name]);
            }
            return !isNumericKey;
        }
        if (utils.isFormData(formData) && utils.isFunction(formData.entries)) {
            const obj = {};
            utils.forEachEntry(formData, (name, value) => {
                buildPath(parsePropPath(name), value, obj, 0);
            });
            return obj;
        }
        return null;
    }

    const DEFAULT_CONTENT_TYPE = {
        'Content-Type': undefined
    };

    /**
     * It takes a string, tries to parse it, and if it fails, it returns the stringified version
     * of the input
     *
     * @param {any} rawValue - The value to be stringified.
     * @param {Function} parser - A function that parses a string into a JavaScript object.
     * @param {Function} encoder - A function that takes a value and returns a string.
     *
     * @returns {string} A stringified version of the rawValue.
     */
    function stringifySafely(rawValue, parser, encoder) {
        if (utils.isString(rawValue)) {
            try {
                (parser || JSON.parse)(rawValue);
                return utils.trim(rawValue);
            } catch (e) {
                if (e.name !== 'SyntaxError') {
                    throw e;
                }
            }
        }
        return (encoder || JSON.stringify)(rawValue);
    }
    const defaults = {
        transitional: transitionalDefaults,
        adapter: ['xhr', 'http'],
        transformRequest: [function transformRequest(data, headers) {
            const contentType = headers.getContentType() || '';
            const hasJSONContentType = contentType.indexOf('application/json') > -1;
            const isObjectPayload = utils.isObject(data);
            if (isObjectPayload && utils.isHTMLForm(data)) {
                data = new FormData(data);
            }
            const isFormData = utils.isFormData(data);
            if (isFormData) {
                if (!hasJSONContentType) {
                    return data;
                }
                return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
            }
            if (utils.isArrayBuffer(data) || utils.isBuffer(data) || utils.isStream(data) || utils.isFile(data) || utils.isBlob(data)) {
                return data;
            }
            if (utils.isArrayBufferView(data)) {
                return data.buffer;
            }
            if (utils.isURLSearchParams(data)) {
                headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
                return data.toString();
            }
            let isFileList;
            if (isObjectPayload) {
                if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
                    return toURLEncodedForm(data, this.formSerializer).toString();
                }
                if ((isFileList = utils.isFileList(data)) || contentType.indexOf('multipart/form-data') > -1) {
                    const _FormData = this.env && this.env.FormData;
                    return toFormData(isFileList ? {
                        'files[]': data
                    } : data, _FormData && new _FormData(), this.formSerializer);
                }
            }
            if (isObjectPayload || hasJSONContentType) {
                headers.setContentType('application/json', false);
                return stringifySafely(data);
            }
            return data;
        }],
        transformResponse: [function transformResponse(data) {
            const transitional = this.transitional || defaults.transitional;
            const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
            const JSONRequested = this.responseType === 'json';
            if (data && utils.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
                const silentJSONParsing = transitional && transitional.silentJSONParsing;
                const strictJSONParsing = !silentJSONParsing && JSONRequested;
                try {
                    return JSON.parse(data);
                } catch (e) {
                    if (strictJSONParsing) {
                        if (e.name === 'SyntaxError') {
                            throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
                        }
                        throw e;
                    }
                }
            }
            return data;
        }],
        /**
         * A timeout in milliseconds to abort a request. If set to 0 (default) a
         * timeout is not created.
         */
        timeout: 0,
        xsrfCookieName: 'XSRF-TOKEN',
        xsrfHeaderName: 'X-XSRF-TOKEN',
        maxContentLength: -1,
        maxBodyLength: -1,
        env: {
            FormData: platform.classes.FormData,
            Blob: platform.classes.Blob
        },
        validateStatus: function validateStatus(status) {
            return status >= 200 && status < 300;
        },
        headers: {
            common: {
                'Accept': 'application/json, text/plain, */*'
            }
        }
    };
    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
        defaults.headers[method] = {};
    });
    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
        defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });
    var defaults$1 = defaults;

    // RawAxiosHeaders whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    const ignoreDuplicateOf = utils.toObjectSet(['age', 'authorization', 'content-length', 'content-type', 'etag', 'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since', 'last-modified', 'location', 'max-forwards', 'proxy-authorization', 'referer', 'retry-after', 'user-agent']);

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} rawHeaders Headers needing to be parsed
     *
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = (rawHeaders => {
        const parsed = {};
        let key;
        let val;
        let i;
        rawHeaders && rawHeaders.split('\n').forEach(function parser(line) {
            i = line.indexOf(':');
            key = line.substring(0, i).trim().toLowerCase();
            val = line.substring(i + 1).trim();
            if (!key || parsed[key] && ignoreDuplicateOf[key]) {
                return;
            }
            if (key === 'set-cookie') {
                if (parsed[key]) {
                    parsed[key].push(val);
                } else {
                    parsed[key] = [val];
                }
            } else {
                parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
            }
        });
        return parsed;
    });

    const $internals = Symbol('internals');
    function normalizeHeader(header) {
        return header && String(header).trim().toLowerCase();
    }
    function normalizeValue(value) {
        if (value === false || value == null) {
            return value;
        }
        return utils.isArray(value) ? value.map(normalizeValue) : String(value);
    }
    function parseTokens(str) {
        const tokens = Object.create(null);
        const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
        let match;
        while (match = tokensRE.exec(str)) {
            tokens[match[1]] = match[2];
        }
        return tokens;
    }
    const isValidHeaderName = str => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
    function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
        if (utils.isFunction(filter)) {
            return filter.call(this, value, header);
        }
        if (isHeaderNameFilter) {
            value = header;
        }
        if (!utils.isString(value)) return;
        if (utils.isString(filter)) {
            return value.indexOf(filter) !== -1;
        }
        if (utils.isRegExp(filter)) {
            return filter.test(value);
        }
    }
    function formatHeader(header) {
        return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
            return char.toUpperCase() + str;
        });
    }
    function buildAccessors(obj, header) {
        const accessorName = utils.toCamelCase(' ' + header);
        ['get', 'set', 'has'].forEach(methodName => {
            Object.defineProperty(obj, methodName + accessorName, {
                value: function (arg1, arg2, arg3) {
                    return this[methodName].call(this, header, arg1, arg2, arg3);
                },
                configurable: true
            });
        });
    }
    class AxiosHeaders {
        constructor(headers) {
            headers && this.set(headers);
        }
        set(header, valueOrRewrite, rewrite) {
            const self = this;
            function setHeader(_value, _header, _rewrite) {
                const lHeader = normalizeHeader(_header);
                if (!lHeader) {
                    throw new Error('header name must be a non-empty string');
                }
                const key = utils.findKey(self, lHeader);
                if (!key || self[key] === undefined || _rewrite === true || _rewrite === undefined && self[key] !== false) {
                    self[key || _header] = normalizeValue(_value);
                }
            }
            const setHeaders = (headers, _rewrite) => utils.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
            if (utils.isPlainObject(header) || header instanceof this.constructor) {
                setHeaders(header, valueOrRewrite);
            } else if (utils.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
                setHeaders(parseHeaders(header), valueOrRewrite);
            } else {
                header != null && setHeader(valueOrRewrite, header, rewrite);
            }
            return this;
        }
        get(header, parser) {
            header = normalizeHeader(header);
            if (header) {
                const key = utils.findKey(this, header);
                if (key) {
                    const value = this[key];
                    if (!parser) {
                        return value;
                    }
                    if (parser === true) {
                        return parseTokens(value);
                    }
                    if (utils.isFunction(parser)) {
                        return parser.call(this, value, key);
                    }
                    if (utils.isRegExp(parser)) {
                        return parser.exec(value);
                    }
                    throw new TypeError('parser must be boolean|regexp|function');
                }
            }
        }
        has(header, matcher) {
            header = normalizeHeader(header);
            if (header) {
                const key = utils.findKey(this, header);
                return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
            }
            return false;
        }
        delete(header, matcher) {
            const self = this;
            let deleted = false;
            function deleteHeader(_header) {
                _header = normalizeHeader(_header);
                if (_header) {
                    const key = utils.findKey(self, _header);
                    if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
                        delete self[key];
                        deleted = true;
                    }
                }
            }
            if (utils.isArray(header)) {
                header.forEach(deleteHeader);
            } else {
                deleteHeader(header);
            }
            return deleted;
        }
        clear(matcher) {
            const keys = Object.keys(this);
            let i = keys.length;
            let deleted = false;
            while (i--) {
                const key = keys[i];
                if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
                    delete this[key];
                    deleted = true;
                }
            }
            return deleted;
        }
        normalize(format) {
            const self = this;
            const headers = {};
            utils.forEach(this, (value, header) => {
                const key = utils.findKey(headers, header);
                if (key) {
                    self[key] = normalizeValue(value);
                    delete self[header];
                    return;
                }
                const normalized = format ? formatHeader(header) : String(header).trim();
                if (normalized !== header) {
                    delete self[header];
                }
                self[normalized] = normalizeValue(value);
                headers[normalized] = true;
            });
            return this;
        }
        concat(...targets) {
            return this.constructor.concat(this, ...targets);
        }
        toJSON(asStrings) {
            const obj = Object.create(null);
            utils.forEach(this, (value, header) => {
                value != null && value !== false && (obj[header] = asStrings && utils.isArray(value) ? value.join(', ') : value);
            });
            return obj;
        }
        [Symbol.iterator]() {
            return Object.entries(this.toJSON())[Symbol.iterator]();
        }
        toString() {
            return Object.entries(this.toJSON()).map(([header, value]) => header + ': ' + value).join('\n');
        }
        get [Symbol.toStringTag]() {
            return 'AxiosHeaders';
        }
        static from(thing) {
            return thing instanceof this ? thing : new this(thing);
        }
        static concat(first, ...targets) {
            const computed = new this(first);
            targets.forEach(target => computed.set(target));
            return computed;
        }
        static accessor(header) {
            const internals = this[$internals] = this[$internals] = {
                accessors: {}
            };
            const accessors = internals.accessors;
            const prototype = this.prototype;
            function defineAccessor(_header) {
                const lHeader = normalizeHeader(_header);
                if (!accessors[lHeader]) {
                    buildAccessors(prototype, _header);
                    accessors[lHeader] = true;
                }
            }
            utils.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
            return this;
        }
    }
    AxiosHeaders.accessor(['Content-Type', 'Content-Length', 'Accept', 'Accept-Encoding', 'User-Agent', 'Authorization']);
    utils.freezeMethods(AxiosHeaders.prototype);
    utils.freezeMethods(AxiosHeaders);
    var AxiosHeaders$1 = AxiosHeaders;

    /**
     * Transform the data for a request or a response
     *
     * @param {Array|Function} fns A single function or Array of functions
     * @param {?Object} response The response object
     *
     * @returns {*} The resulting transformed data
     */
    function transformData(fns, response) {
        const config = this || defaults$1;
        const context = response || config;
        const headers = AxiosHeaders$1.from(context.headers);
        let data = context.data;
        utils.forEach(fns, function transform(fn) {
            data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
        });
        headers.normalize();
        return data;
    }

    function isCancel(value) {
        return !!(value && value.__CANCEL__);
    }

    /**
     * A `CanceledError` is an object that is thrown when an operation is canceled.
     *
     * @param {string=} message The message.
     * @param {Object=} config The config.
     * @param {Object=} request The request.
     *
     * @returns {CanceledError} The created error.
     */
    function CanceledError(message, config, request) {
        // eslint-disable-next-line no-eq-null,eqeqeq
        AxiosError.call(this, message == null ? 'canceled' : message, AxiosError.ERR_CANCELED, config, request);
        this.name = 'CanceledError';
    }
    utils.inherits(CanceledError, AxiosError, {
        __CANCEL__: true
    });

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     *
     * @returns {object} The response.
     */
    function settle(resolve, reject, response) {
        const validateStatus = response.config.validateStatus;
        if (!response.status || !validateStatus || validateStatus(response.status)) {
            resolve(response);
        } else {
            reject(new AxiosError('Request failed with status code ' + response.status, [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4], response.config, response.request, response));
        }
    }

    var cookies = platform.isStandardBrowserEnv ?
        // Standard browser envs support document.cookie
        function standardBrowserEnv() {
            return {
                write: function write(name, value, expires, path, domain, secure) {
                    const cookie = [];
                    cookie.push(name + '=' + encodeURIComponent(value));
                    if (utils.isNumber(expires)) {
                        cookie.push('expires=' + new Date(expires).toGMTString());
                    }
                    if (utils.isString(path)) {
                        cookie.push('path=' + path);
                    }
                    if (utils.isString(domain)) {
                        cookie.push('domain=' + domain);
                    }
                    if (secure === true) {
                        cookie.push('secure');
                    }
                    document.cookie = cookie.join('; ');
                },
                read: function read(name) {
                    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
                    return match ? decodeURIComponent(match[3]) : null;
                },
                remove: function remove(name) {
                    this.write(name, '', Date.now() - 86400000);
                }
            };
        }() :
        // Non standard browser .env (web workers, react-native) lack needed support.
        function nonStandardBrowserEnv() {
            return {
                write: function write() {},
                read: function read() {
                    return null;
                },
                remove: function remove() {}
            };
        }();

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     *
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    function isAbsoluteURL(url) {
        // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
        // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
        // by any combination of letters, digits, plus, period, or hyphen.
        return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
    }

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     *
     * @returns {string} The combined URL
     */
    function combineURLs(baseURL, relativeURL) {
        return relativeURL ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '') : baseURL;
    }

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     *
     * @returns {string} The combined full path
     */
    function buildFullPath(baseURL, requestedURL) {
        if (baseURL && !isAbsoluteURL(requestedURL)) {
            return combineURLs(baseURL, requestedURL);
        }
        return requestedURL;
    }

    var isURLSameOrigin = platform.isStandardBrowserEnv ?
        // Standard browser envs have full support of the APIs needed to test
        // whether the request URL is of the same origin as current location.
        function standardBrowserEnv() {
            const msie = /(msie|trident)/i.test(navigator.userAgent);
            const urlParsingNode = document.createElement('a');
            let originURL;

            /**
             * Parse a URL to discover it's components
             *
             * @param {String} url The URL to be parsed
             * @returns {Object}
             */
            function resolveURL(url) {
                let href = url;
                if (msie) {
                    // IE needs attribute set twice to normalize properties
                    urlParsingNode.setAttribute('href', href);
                    href = urlParsingNode.href;
                }
                urlParsingNode.setAttribute('href', href);

                // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
                return {
                    href: urlParsingNode.href,
                    protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
                    host: urlParsingNode.host,
                    search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
                    hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
                    hostname: urlParsingNode.hostname,
                    port: urlParsingNode.port,
                    pathname: urlParsingNode.pathname.charAt(0) === '/' ? urlParsingNode.pathname : '/' + urlParsingNode.pathname
                };
            }
            originURL = resolveURL(window.location.href);

            /**
             * Determine if a URL shares the same origin as the current location
             *
             * @param {String} requestURL The URL to test
             * @returns {boolean} True if URL shares the same origin, otherwise false
             */
            return function isURLSameOrigin(requestURL) {
                const parsed = utils.isString(requestURL) ? resolveURL(requestURL) : requestURL;
                return parsed.protocol === originURL.protocol && parsed.host === originURL.host;
            };
        }() :
        // Non standard browser envs (web workers, react-native) lack needed support.
        function nonStandardBrowserEnv() {
            return function isURLSameOrigin() {
                return true;
            };
        }();

    function parseProtocol(url) {
        const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
        return match && match[1] || '';
    }

    /**
     * Calculate data maxRate
     * @param {Number} [samplesCount= 10]
     * @param {Number} [min= 1000]
     * @returns {Function}
     */
    function speedometer(samplesCount, min) {
        samplesCount = samplesCount || 10;
        const bytes = new Array(samplesCount);
        const timestamps = new Array(samplesCount);
        let head = 0;
        let tail = 0;
        let firstSampleTS;
        min = min !== undefined ? min : 1000;
        return function push(chunkLength) {
            const now = Date.now();
            const startedAt = timestamps[tail];
            if (!firstSampleTS) {
                firstSampleTS = now;
            }
            bytes[head] = chunkLength;
            timestamps[head] = now;
            let i = tail;
            let bytesCount = 0;
            while (i !== head) {
                bytesCount += bytes[i++];
                i = i % samplesCount;
            }
            head = (head + 1) % samplesCount;
            if (head === tail) {
                tail = (tail + 1) % samplesCount;
            }
            if (now - firstSampleTS < min) {
                return;
            }
            const passed = startedAt && now - startedAt;
            return passed ? Math.round(bytesCount * 1000 / passed) : undefined;
        };
    }

    function progressEventReducer(listener, isDownloadStream) {
        let bytesNotified = 0;
        const _speedometer = speedometer(50, 250);
        return e => {
            const loaded = e.loaded;
            const total = e.lengthComputable ? e.total : undefined;
            const progressBytes = loaded - bytesNotified;
            const rate = _speedometer(progressBytes);
            const inRange = loaded <= total;
            bytesNotified = loaded;
            const data = {
                loaded,
                total,
                progress: total ? loaded / total : undefined,
                bytes: progressBytes,
                rate: rate ? rate : undefined,
                estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
                event: e
            };
            data[isDownloadStream ? 'download' : 'upload'] = true;
            listener(data);
        };
    }
    const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';
    var xhrAdapter = isXHRAdapterSupported && function (config) {
        return new Promise(function dispatchXhrRequest(resolve, reject) {
            let requestData = config.data;
            const requestHeaders = AxiosHeaders$1.from(config.headers).normalize();
            const responseType = config.responseType;
            let onCanceled;
            function done() {
                if (config.cancelToken) {
                    config.cancelToken.unsubscribe(onCanceled);
                }
                if (config.signal) {
                    config.signal.removeEventListener('abort', onCanceled);
                }
            }
            if (utils.isFormData(requestData)) {
                if (platform.isStandardBrowserEnv || platform.isStandardBrowserWebWorkerEnv) {
                    requestHeaders.setContentType(false); // Let the browser set it
                } else {
                    requestHeaders.setContentType('multipart/form-data;', false); // mobile/desktop app frameworks
                }
            }

            let request = new XMLHttpRequest();

            // HTTP basic authentication
            if (config.auth) {
                const username = config.auth.username || '';
                const password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
                requestHeaders.set('Authorization', 'Basic ' + btoa(username + ':' + password));
            }
            const fullPath = buildFullPath(config.baseURL, config.url);
            request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

            // Set the request timeout in MS
            request.timeout = config.timeout;
            function onloadend() {
                if (!request) {
                    return;
                }
                // Prepare the response
                const responseHeaders = AxiosHeaders$1.from('getAllResponseHeaders' in request && request.getAllResponseHeaders());
                const responseData = !responseType || responseType === 'text' || responseType === 'json' ? request.responseText : request.response;
                const response = {
                    data: responseData,
                    status: request.status,
                    statusText: request.statusText,
                    headers: responseHeaders,
                    config,
                    request
                };
                settle(function _resolve(value) {
                    resolve(value);
                    done();
                }, function _reject(err) {
                    reject(err);
                    done();
                }, response);

                // Clean up request
                request = null;
            }
            if ('onloadend' in request) {
                // Use onloadend if available
                request.onloadend = onloadend;
            } else {
                // Listen for ready state to emulate onloadend
                request.onreadystatechange = function handleLoad() {
                    if (!request || request.readyState !== 4) {
                        return;
                    }

                    // The request errored out and we didn't get a response, this will be
                    // handled by onerror instead
                    // With one exception: request that using file: protocol, most browsers
                    // will return status as 0 even though it's a successful request
                    if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
                        return;
                    }
                    // readystate handler is calling before onerror or ontimeout handlers,
                    // so we should call onloadend on the next 'tick'
                    setTimeout(onloadend);
                };
            }

            // Handle browser request cancellation (as opposed to a manual cancellation)
            request.onabort = function handleAbort() {
                if (!request) {
                    return;
                }
                reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));

                // Clean up request
                request = null;
            };

            // Handle low level network errors
            request.onerror = function handleError() {
                // Real errors are hidden from us by the browser
                // onerror should only fire if it's a network error
                reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request));

                // Clean up request
                request = null;
            };

            // Handle timeout
            request.ontimeout = function handleTimeout() {
                let timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
                const transitional = config.transitional || transitionalDefaults;
                if (config.timeoutErrorMessage) {
                    timeoutErrorMessage = config.timeoutErrorMessage;
                }
                reject(new AxiosError(timeoutErrorMessage, transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED, config, request));

                // Clean up request
                request = null;
            };

            // Add xsrf header
            // This is only done if running in a standard browser environment.
            // Specifically not if we're in a web worker, or react-native.
            if (platform.isStandardBrowserEnv) {
                // Add xsrf header
                const xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName && cookies.read(config.xsrfCookieName);
                if (xsrfValue) {
                    requestHeaders.set(config.xsrfHeaderName, xsrfValue);
                }
            }

            // Remove Content-Type if data is undefined
            requestData === undefined && requestHeaders.setContentType(null);

            // Add headers to the request
            if ('setRequestHeader' in request) {
                utils.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
                    request.setRequestHeader(key, val);
                });
            }

            // Add withCredentials to request if needed
            if (!utils.isUndefined(config.withCredentials)) {
                request.withCredentials = !!config.withCredentials;
            }

            // Add responseType to request if needed
            if (responseType && responseType !== 'json') {
                request.responseType = config.responseType;
            }

            // Handle progress if needed
            if (typeof config.onDownloadProgress === 'function') {
                request.addEventListener('progress', progressEventReducer(config.onDownloadProgress, true));
            }

            // Not all browsers support upload events
            if (typeof config.onUploadProgress === 'function' && request.upload) {
                request.upload.addEventListener('progress', progressEventReducer(config.onUploadProgress));
            }
            if (config.cancelToken || config.signal) {
                // Handle cancellation
                // eslint-disable-next-line func-names
                onCanceled = cancel => {
                    if (!request) {
                        return;
                    }
                    reject(!cancel || cancel.type ? new CanceledError(null, config, request) : cancel);
                    request.abort();
                    request = null;
                };
                config.cancelToken && config.cancelToken.subscribe(onCanceled);
                if (config.signal) {
                    config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
                }
            }
            const protocol = parseProtocol(fullPath);
            if (protocol && platform.protocols.indexOf(protocol) === -1) {
                reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
                return;
            }

            // Send the request
            request.send(requestData || null);
        });
    };

    const knownAdapters = {
        http: httpAdapter,
        xhr: xhrAdapter
    };
    utils.forEach(knownAdapters, (fn, value) => {
        if (fn) {
            try {
                Object.defineProperty(fn, 'name', {
                    value
                });
            } catch (e) {
                // eslint-disable-next-line no-empty
            }
            Object.defineProperty(fn, 'adapterName', {
                value
            });
        }
    });
    var adapters = {
        getAdapter: adapters => {
            adapters = utils.isArray(adapters) ? adapters : [adapters];
            const {
                length
            } = adapters;
            let nameOrAdapter;
            let adapter;
            for (let i = 0; i < length; i++) {
                nameOrAdapter = adapters[i];
                if (adapter = utils.isString(nameOrAdapter) ? knownAdapters[nameOrAdapter.toLowerCase()] : nameOrAdapter) {
                    break;
                }
            }
            if (!adapter) {
                if (adapter === false) {
                    throw new AxiosError(`Adapter ${nameOrAdapter} is not supported by the environment`, 'ERR_NOT_SUPPORT');
                }
                throw new Error(utils.hasOwnProp(knownAdapters, nameOrAdapter) ? `Adapter '${nameOrAdapter}' is not available in the build` : `Unknown adapter '${nameOrAdapter}'`);
            }
            if (!utils.isFunction(adapter)) {
                throw new TypeError('adapter is not a function');
            }
            return adapter;
        },
        adapters: knownAdapters
    };

    /**
     * Throws a `CanceledError` if cancellation has been requested.
     *
     * @param {Object} config The config that is to be used for the request
     *
     * @returns {void}
     */
    function throwIfCancellationRequested(config) {
        if (config.cancelToken) {
            config.cancelToken.throwIfRequested();
        }
        if (config.signal && config.signal.aborted) {
            throw new CanceledError(null, config);
        }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     *
     * @returns {Promise} The Promise to be fulfilled
     */
    function dispatchRequest(config) {
        throwIfCancellationRequested(config);
        config.headers = AxiosHeaders$1.from(config.headers);

        // Transform request data
        config.data = transformData.call(config, config.transformRequest);
        if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
            config.headers.setContentType('application/x-www-form-urlencoded', false);
        }
        const adapter = adapters.getAdapter(config.adapter || defaults$1.adapter);
        return adapter(config).then(function onAdapterResolution(response) {
            throwIfCancellationRequested(config);

            // Transform response data
            response.data = transformData.call(config, config.transformResponse, response);
            response.headers = AxiosHeaders$1.from(response.headers);
            return response;
        }, function onAdapterRejection(reason) {
            if (!isCancel(reason)) {
                throwIfCancellationRequested(config);

                // Transform response data
                if (reason && reason.response) {
                    reason.response.data = transformData.call(config, config.transformResponse, reason.response);
                    reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
                }
            }
            return Promise.reject(reason);
        });
    }

    const headersToObject = thing => thing instanceof AxiosHeaders$1 ? thing.toJSON() : thing;

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     *
     * @returns {Object} New object resulting from merging config2 to config1
     */
    function mergeConfig(config1, config2) {
        // eslint-disable-next-line no-param-reassign
        config2 = config2 || {};
        const config = {};
        function getMergedValue(target, source, caseless) {
            if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
                return utils.merge.call({
                    caseless
                }, target, source);
            } else if (utils.isPlainObject(source)) {
                return utils.merge({}, source);
            } else if (utils.isArray(source)) {
                return source.slice();
            }
            return source;
        }

        // eslint-disable-next-line consistent-return
        function mergeDeepProperties(a, b, caseless) {
            if (!utils.isUndefined(b)) {
                return getMergedValue(a, b, caseless);
            } else if (!utils.isUndefined(a)) {
                return getMergedValue(undefined, a, caseless);
            }
        }

        // eslint-disable-next-line consistent-return
        function valueFromConfig2(a, b) {
            if (!utils.isUndefined(b)) {
                return getMergedValue(undefined, b);
            }
        }

        // eslint-disable-next-line consistent-return
        function defaultToConfig2(a, b) {
            if (!utils.isUndefined(b)) {
                return getMergedValue(undefined, b);
            } else if (!utils.isUndefined(a)) {
                return getMergedValue(undefined, a);
            }
        }

        // eslint-disable-next-line consistent-return
        function mergeDirectKeys(a, b, prop) {
            if (prop in config2) {
                return getMergedValue(a, b);
            } else if (prop in config1) {
                return getMergedValue(undefined, a);
            }
        }
        const mergeMap = {
            url: valueFromConfig2,
            method: valueFromConfig2,
            data: valueFromConfig2,
            baseURL: defaultToConfig2,
            transformRequest: defaultToConfig2,
            transformResponse: defaultToConfig2,
            paramsSerializer: defaultToConfig2,
            timeout: defaultToConfig2,
            timeoutMessage: defaultToConfig2,
            withCredentials: defaultToConfig2,
            adapter: defaultToConfig2,
            responseType: defaultToConfig2,
            xsrfCookieName: defaultToConfig2,
            xsrfHeaderName: defaultToConfig2,
            onUploadProgress: defaultToConfig2,
            onDownloadProgress: defaultToConfig2,
            decompress: defaultToConfig2,
            maxContentLength: defaultToConfig2,
            maxBodyLength: defaultToConfig2,
            beforeRedirect: defaultToConfig2,
            transport: defaultToConfig2,
            httpAgent: defaultToConfig2,
            httpsAgent: defaultToConfig2,
            cancelToken: defaultToConfig2,
            socketPath: defaultToConfig2,
            responseEncoding: defaultToConfig2,
            validateStatus: mergeDirectKeys,
            headers: (a, b) => mergeDeepProperties(headersToObject(a), headersToObject(b), true)
        };
        utils.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
            const merge = mergeMap[prop] || mergeDeepProperties;
            const configValue = merge(config1[prop], config2[prop], prop);
            utils.isUndefined(configValue) && merge !== mergeDirectKeys || (config[prop] = configValue);
        });
        return config;
    }

    const VERSION = "1.4.0";

    const validators$1 = {};

    // eslint-disable-next-line func-names
    ['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach((type, i) => {
        validators$1[type] = function validator(thing) {
            return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
        };
    });
    const deprecatedWarnings = {};

    /**
     * Transitional option validator
     *
     * @param {function|boolean?} validator - set to false if the transitional option has been removed
     * @param {string?} version - deprecated version / removed since version
     * @param {string?} message - some message with additional info
     *
     * @returns {function}
     */
    validators$1.transitional = function transitional(validator, version, message) {
        function formatMessage(opt, desc) {
            return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
        }

        // eslint-disable-next-line func-names
        return (value, opt, opts) => {
            if (validator === false) {
                throw new AxiosError(formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')), AxiosError.ERR_DEPRECATED);
            }
            if (version && !deprecatedWarnings[opt]) {
                deprecatedWarnings[opt] = true;
                // eslint-disable-next-line no-console
                console.warn(formatMessage(opt, ' has been deprecated since v' + version + ' and will be removed in the near future'));
            }
            return validator ? validator(value, opt, opts) : true;
        };
    };

    /**
     * Assert object's properties type
     *
     * @param {object} options
     * @param {object} schema
     * @param {boolean?} allowUnknown
     *
     * @returns {object}
     */

    function assertOptions(options, schema, allowUnknown) {
        if (typeof options !== 'object') {
            throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
        }
        const keys = Object.keys(options);
        let i = keys.length;
        while (i-- > 0) {
            const opt = keys[i];
            const validator = schema[opt];
            if (validator) {
                const value = options[opt];
                const result = value === undefined || validator(value, opt, options);
                if (result !== true) {
                    throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
                }
                continue;
            }
            if (allowUnknown !== true) {
                throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
            }
        }
    }
    var validator = {
        assertOptions,
        validators: validators$1
    };

    const validators = validator.validators;

    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     *
     * @return {Axios} A new instance of Axios
     */
    class Axios {
        constructor(instanceConfig) {
            this.defaults = instanceConfig;
            this.interceptors = {
                request: new InterceptorManager$1(),
                response: new InterceptorManager$1()
            };
        }

        /**
         * Dispatch a request
         *
         * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
         * @param {?Object} config
         *
         * @returns {Promise} The Promise to be fulfilled
         */
        request(configOrUrl, config) {
            /*eslint no-param-reassign:0*/
            // Allow for axios('example/url'[, config]) a la fetch API
            if (typeof configOrUrl === 'string') {
                config = config || {};
                config.url = configOrUrl;
            } else {
                config = configOrUrl || {};
            }
            config = mergeConfig(this.defaults, config);
            const {
                transitional,
                paramsSerializer,
                headers
            } = config;
            if (transitional !== undefined) {
                validator.assertOptions(transitional, {
                    silentJSONParsing: validators.transitional(validators.boolean),
                    forcedJSONParsing: validators.transitional(validators.boolean),
                    clarifyTimeoutError: validators.transitional(validators.boolean)
                }, false);
            }
            if (paramsSerializer != null) {
                if (utils.isFunction(paramsSerializer)) {
                    config.paramsSerializer = {
                        serialize: paramsSerializer
                    };
                } else {
                    validator.assertOptions(paramsSerializer, {
                        encode: validators.function,
                        serialize: validators.function
                    }, true);
                }
            }

            // Set config.method
            config.method = (config.method || this.defaults.method || 'get').toLowerCase();
            let contextHeaders;

            // Flatten headers
            contextHeaders = headers && utils.merge(headers.common, headers[config.method]);
            contextHeaders && utils.forEach(['delete', 'get', 'head', 'post', 'put', 'patch', 'common'], method => {
                delete headers[method];
            });
            config.headers = AxiosHeaders$1.concat(contextHeaders, headers);

            // filter out skipped interceptors
            const requestInterceptorChain = [];
            let synchronousRequestInterceptors = true;
            this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
                if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
                    return;
                }
                synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
                requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
            });
            const responseInterceptorChain = [];
            this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
                responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
            });
            let promise;
            let i = 0;
            let len;
            if (!synchronousRequestInterceptors) {
                const chain = [dispatchRequest.bind(this), undefined];
                chain.unshift.apply(chain, requestInterceptorChain);
                chain.push.apply(chain, responseInterceptorChain);
                len = chain.length;
                promise = Promise.resolve(config);
                while (i < len) {
                    promise = promise.then(chain[i++], chain[i++]);
                }
                return promise;
            }
            len = requestInterceptorChain.length;
            let newConfig = config;
            i = 0;
            while (i < len) {
                const onFulfilled = requestInterceptorChain[i++];
                const onRejected = requestInterceptorChain[i++];
                try {
                    newConfig = onFulfilled(newConfig);
                } catch (error) {
                    onRejected.call(this, error);
                    break;
                }
            }
            try {
                promise = dispatchRequest.call(this, newConfig);
            } catch (error) {
                return Promise.reject(error);
            }
            i = 0;
            len = responseInterceptorChain.length;
            while (i < len) {
                promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
            }
            return promise;
        }
        getUri(config) {
            config = mergeConfig(this.defaults, config);
            const fullPath = buildFullPath(config.baseURL, config.url);
            return buildURL(fullPath, config.params, config.paramsSerializer);
        }
    }

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
        /*eslint func-names:0*/
        Axios.prototype[method] = function (url, config) {
            return this.request(mergeConfig(config || {}, {
                method,
                url,
                data: (config || {}).data
            }));
        };
    });
    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
        /*eslint func-names:0*/

        function generateHTTPMethod(isForm) {
            return function httpMethod(url, data, config) {
                return this.request(mergeConfig(config || {}, {
                    method,
                    headers: isForm ? {
                        'Content-Type': 'multipart/form-data'
                    } : {},
                    url,
                    data
                }));
            };
        }
        Axios.prototype[method] = generateHTTPMethod();
        Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
    });
    var Axios$1 = Axios;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @param {Function} executor The executor function.
     *
     * @returns {CancelToken}
     */
    class CancelToken {
        constructor(executor) {
            if (typeof executor !== 'function') {
                throw new TypeError('executor must be a function.');
            }
            let resolvePromise;
            this.promise = new Promise(function promiseExecutor(resolve) {
                resolvePromise = resolve;
            });
            const token = this;

            // eslint-disable-next-line func-names
            this.promise.then(cancel => {
                if (!token._listeners) return;
                let i = token._listeners.length;
                while (i-- > 0) {
                    token._listeners[i](cancel);
                }
                token._listeners = null;
            });

            // eslint-disable-next-line func-names
            this.promise.then = onfulfilled => {
                let _resolve;
                // eslint-disable-next-line func-names
                const promise = new Promise(resolve => {
                    token.subscribe(resolve);
                    _resolve = resolve;
                }).then(onfulfilled);
                promise.cancel = function reject() {
                    token.unsubscribe(_resolve);
                };
                return promise;
            };
            executor(function cancel(message, config, request) {
                if (token.reason) {
                    // Cancellation has already been requested
                    return;
                }
                token.reason = new CanceledError(message, config, request);
                resolvePromise(token.reason);
            });
        }

        /**
         * Throws a `CanceledError` if cancellation has been requested.
         */
        throwIfRequested() {
            if (this.reason) {
                throw this.reason;
            }
        }

        /**
         * Subscribe to the cancel signal
         */

        subscribe(listener) {
            if (this.reason) {
                listener(this.reason);
                return;
            }
            if (this._listeners) {
                this._listeners.push(listener);
            } else {
                this._listeners = [listener];
            }
        }

        /**
         * Unsubscribe from the cancel signal
         */

        unsubscribe(listener) {
            if (!this._listeners) {
                return;
            }
            const index = this._listeners.indexOf(listener);
            if (index !== -1) {
                this._listeners.splice(index, 1);
            }
        }

        /**
         * Returns an object that contains a new `CancelToken` and a function that, when called,
         * cancels the `CancelToken`.
         */
        static source() {
            let cancel;
            const token = new CancelToken(function executor(c) {
                cancel = c;
            });
            return {
                token,
                cancel
            };
        }
    }
    var CancelToken$1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     *
     * @returns {Function}
     */
    function spread(callback) {
        return function wrap(arr) {
            return callback.apply(null, arr);
        };
    }

    /**
     * Determines whether the payload is an error thrown by Axios
     *
     * @param {*} payload The value to test
     *
     * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
     */
    function isAxiosError(payload) {
        return utils.isObject(payload) && payload.isAxiosError === true;
    }

    const HttpStatusCode = {
        Continue: 100,
        SwitchingProtocols: 101,
        Processing: 102,
        EarlyHints: 103,
        Ok: 200,
        Created: 201,
        Accepted: 202,
        NonAuthoritativeInformation: 203,
        NoContent: 204,
        ResetContent: 205,
        PartialContent: 206,
        MultiStatus: 207,
        AlreadyReported: 208,
        ImUsed: 226,
        MultipleChoices: 300,
        MovedPermanently: 301,
        Found: 302,
        SeeOther: 303,
        NotModified: 304,
        UseProxy: 305,
        Unused: 306,
        TemporaryRedirect: 307,
        PermanentRedirect: 308,
        BadRequest: 400,
        Unauthorized: 401,
        PaymentRequired: 402,
        Forbidden: 403,
        NotFound: 404,
        MethodNotAllowed: 405,
        NotAcceptable: 406,
        ProxyAuthenticationRequired: 407,
        RequestTimeout: 408,
        Conflict: 409,
        Gone: 410,
        LengthRequired: 411,
        PreconditionFailed: 412,
        PayloadTooLarge: 413,
        UriTooLong: 414,
        UnsupportedMediaType: 415,
        RangeNotSatisfiable: 416,
        ExpectationFailed: 417,
        ImATeapot: 418,
        MisdirectedRequest: 421,
        UnprocessableEntity: 422,
        Locked: 423,
        FailedDependency: 424,
        TooEarly: 425,
        UpgradeRequired: 426,
        PreconditionRequired: 428,
        TooManyRequests: 429,
        RequestHeaderFieldsTooLarge: 431,
        UnavailableForLegalReasons: 451,
        InternalServerError: 500,
        NotImplemented: 501,
        BadGateway: 502,
        ServiceUnavailable: 503,
        GatewayTimeout: 504,
        HttpVersionNotSupported: 505,
        VariantAlsoNegotiates: 506,
        InsufficientStorage: 507,
        LoopDetected: 508,
        NotExtended: 510,
        NetworkAuthenticationRequired: 511
    };
    Object.entries(HttpStatusCode).forEach(([key, value]) => {
        HttpStatusCode[value] = key;
    });
    var HttpStatusCode$1 = HttpStatusCode;

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     *
     * @returns {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
        const context = new Axios$1(defaultConfig);
        const instance = bind(Axios$1.prototype.request, context);

        // Copy axios.prototype to instance
        utils.extend(instance, Axios$1.prototype, context, {
            allOwnKeys: true
        });

        // Copy context to instance
        utils.extend(instance, context, null, {
            allOwnKeys: true
        });

        // Factory for creating new instances
        instance.create = function create(instanceConfig) {
            return createInstance(mergeConfig(defaultConfig, instanceConfig));
        };
        return instance;
    }

    // Create the default instance to be exported
    const axios = createInstance(defaults$1);

    // Expose Axios class to allow class inheritance
    axios.Axios = Axios$1;

    // Expose Cancel & CancelToken
    axios.CanceledError = CanceledError;
    axios.CancelToken = CancelToken$1;
    axios.isCancel = isCancel;
    axios.VERSION = VERSION;
    axios.toFormData = toFormData;

    // Expose AxiosError class
    axios.AxiosError = AxiosError;

    // alias for CanceledError for backward compatibility
    axios.Cancel = axios.CanceledError;

    // Expose all/spread
    axios.all = function all(promises) {
        return Promise.all(promises);
    };
    axios.spread = spread;

    // Expose isAxiosError
    axios.isAxiosError = isAxiosError;

    // Expose mergeConfig
    axios.mergeConfig = mergeConfig;
    axios.AxiosHeaders = AxiosHeaders$1;
    axios.formToJSON = thing => formDataToJSON(utils.isHTMLForm(thing) ? new FormData(thing) : thing);
    axios.HttpStatusCode = HttpStatusCode$1;
    axios.default = axios;

    // this module should only have a default export
    var axios$1 = axios;

    var api = axios$1.create({
        baseURL: '/api/aws',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    function e(e) {
        this.message = e;
    }
    e.prototype = new Error(), e.prototype.name = "InvalidCharacterError";
    var r = "undefined" != typeof window && window.atob && window.atob.bind(window) || function (r) {
        var t = String(r).replace(/=+$/, "");
        if (t.length % 4 == 1) throw new e("'atob' failed: The string to be decoded is not correctly encoded.");
        for (var n, o, a = 0, i = 0, c = ""; o = t.charAt(i++); ~o && (n = a % 4 ? 64 * n + o : o, a++ % 4) ? c += String.fromCharCode(255 & n >> (-2 * a & 6)) : 0) o = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(o);
        return c;
    };
    function t(e) {
        var t = e.replace(/-/g, "+").replace(/_/g, "/");
        switch (t.length % 4) {
            case 0:
                break;
            case 2:
                t += "==";
                break;
            case 3:
                t += "=";
                break;
            default:
                throw "Illegal base64url string!";
        }
        try {
            return function (e) {
                return decodeURIComponent(r(e).replace(/(.)/g, function (e, r) {
                    var t = r.charCodeAt(0).toString(16).toUpperCase();
                    return t.length < 2 && (t = "0" + t), "%" + t;
                }));
            }(t);
        } catch (e) {
            return r(t);
        }
    }
    function n(e) {
        this.message = e;
    }
    function o(e, r) {
        if ("string" != typeof e) throw new n("Invalid token specified");
        var o = !0 === (r = r || {}).header ? 0 : 1;
        try {
            return JSON.parse(t(e.split(".")[o]));
        } catch (e) {
            throw new n("Invalid token specified: " + e.message);
        }
    }
    n.prototype = new Error(), n.prototype.name = "InvalidTokenError";

    function authView() {
        module_default.data('auth', function (view) {
            return {
                required: [],
                isProcessing: false,
                isSubmitable: false,
                success: false,
                init: function init() {
                    var _this = this;
                    this.$refs.form.querySelectorAll('[required]').forEach(function (element) {
                        _this.required.push(element);
                        element.addEventListener('input', function () {
                            return _this.checkIsSubmitable();
                        });
                    });
                    this.checkIsSubmitable();
                },
                submit: function submit() {
                    var _this2 = this;
                    if (!this.isSubmitable || this.isProcessing) {
                        return;
                    }
                    this.isProcessing = true;
                    var data = new FormData(this.$refs.form);
                    this.$refs.form.querySelectorAll('input[type="checkbox"]').forEach(function (element) {
                        data.append(element.name, element.checked ? '1' : '0');
                    });
                    const params = new Proxy(new URLSearchParams(window.location.search), {
                        get: (searchParams, prop) => searchParams.get(prop),
                    });

                    console.log("params", params);
                    if (params.c_id) data.append('c_id', params.c_id);

                    api.post(this.$refs.form.dataset.apiPath, data).then(function (response) {
                        if (response.data.jwt) {
                            var jwt = response.data.jwt;
                            var payload = o(jwt);

                            // Save the JWT to local storage
                            // to be used for future api requests
                            localStorage.setItem('jwt', jwt);

                            // Redirect user to the app or admin dashboard
                            window.location.href = payload.is_admin ? '/admin' : '/app';

                            // Response should include the user cookie (autosaved)
                            // for authenticatoin of the UI GET requests
                        } else {
                            _this2.isProcessing = true;
                            _this2.success = true;
                        }
                    })["catch"](function (error) {
                        var msg = 'An unexpected error occurred! Please try again later!';
                        if (error.response && error.response.status == 401) {
                            msg = "Authentication failed! Please check your credentials and try again!";
                        }
                        if (error.response && error.response.data.message) {
                            msg = error.response.data.message;
                        }
                        _this2.isProcessing = false;
                        window.toast.show(msg, 'ti ti-square-rounded-x-filled');
                    });
                },
                checkIsSubmitable: function checkIsSubmitable() {
                    for (var i = 0; i < this.required.length; i++) {
                        var el = this.required[i];
                        if (!el.value) {
                            this.isSubmitable = false;
                            return;
                        }
                    }
                    this.isSubmitable = true;
                }
            };
        });
    }

    authView();
    module_default.start();

})();
//# sourceMappingURL=auth.js.map
