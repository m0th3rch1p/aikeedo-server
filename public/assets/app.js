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
  function warn$1(message, ...args) {
    console.warn(`Alpine Warning: ${message}`, ...args);
  }

  // packages/alpinejs/src/lifecycle.js
  var started = false;
  function start() {
    if (started) warn$1("Alpine has already been initialized on this page. Calling Alpine.start() more than once can cause problems.");
    started = true;
    if (!document.body) warn$1("Unable to initialize. Trying to load Alpine before `<body>` is available. Did you forget to add `defer` in Alpine's `<script>` tag?");
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
  function debounce$1(func, wait) {
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
    debounce: debounce$1,
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
  function ownKeys$1(target) {
    track(target, "iterate", isArray$1(target) ? "length" : ITERATE_KEY);
    return Reflect.ownKeys(target);
  }
  var mutableHandlers = {
    get: get2,
    set: set2,
    deleteProperty,
    has,
    ownKeys: ownKeys$1
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
    magic(magicName, el => warn$1(`You can't use [$${directiveName}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
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
    if (el.tagName.toLowerCase() !== "template") warn$1("x-teleport can only be used on a <template> tag", el);
    let target = skipDuringClone(() => {
      return document.querySelector(expression);
    }, () => {
      return teleportContainerDuringClone;
    })();
    if (!target) warn$1(`Cannot find x-teleport element for selector: "${expression}"`);
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
      handler4 = debounce$1(handler4, wait);
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
          if (!elForSpot) warn$1(`x-for ":key" is undefined or invalid`, templateEl);
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
          warn$1("x-for key cannot be an object, it must be a string or an integer", templateEl);
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
    directive(directiveName2, el => warn$1(`You can't use [x-${directiveName2}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
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

  function initState() {
    module_default.store('presets', []);
  }

  function _iterableToArrayLimit(arr, i) {
    var _i = null == arr ? null : "undefined" != typeof Symbol && arr[Symbol.iterator] || arr["@@iterator"];
    if (null != _i) {
      var _s,
        _e,
        _x,
        _r,
        _arr = [],
        _n = !0,
        _d = !1;
      try {
        if (_x = (_i = _i.call(arr)).next, 0 === i) {
          if (Object(_i) !== _i) return;
          _n = !1;
        } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0);
      } catch (err) {
        _d = !0, _e = err;
      } finally {
        try {
          if (!_n && null != _i.return && (_r = _i.return(), Object(_r) !== _r)) return;
        } finally {
          if (_d) throw _e;
        }
      }
      return _arr;
    }
  }
  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      enumerableOnly && (symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      })), keys.push.apply(keys, symbols);
    }
    return keys;
  }
  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = null != arguments[i] ? arguments[i] : {};
      i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
    return target;
  }
  function _regeneratorRuntime() {
    _regeneratorRuntime = function () {
      return exports;
    };
    var exports = {},
      Op = Object.prototype,
      hasOwn = Op.hasOwnProperty,
      defineProperty = Object.defineProperty || function (obj, key, desc) {
        obj[key] = desc.value;
      },
      $Symbol = "function" == typeof Symbol ? Symbol : {},
      iteratorSymbol = $Symbol.iterator || "@@iterator",
      asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator",
      toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";
    function define(obj, key, value) {
      return Object.defineProperty(obj, key, {
        value: value,
        enumerable: !0,
        configurable: !0,
        writable: !0
      }), obj[key];
    }
    try {
      define({}, "");
    } catch (err) {
      define = function (obj, key, value) {
        return obj[key] = value;
      };
    }
    function wrap(innerFn, outerFn, self, tryLocsList) {
      var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator,
        generator = Object.create(protoGenerator.prototype),
        context = new Context(tryLocsList || []);
      return defineProperty(generator, "_invoke", {
        value: makeInvokeMethod(innerFn, self, context)
      }), generator;
    }
    function tryCatch(fn, obj, arg) {
      try {
        return {
          type: "normal",
          arg: fn.call(obj, arg)
        };
      } catch (err) {
        return {
          type: "throw",
          arg: err
        };
      }
    }
    exports.wrap = wrap;
    var ContinueSentinel = {};
    function Generator() {}
    function GeneratorFunction() {}
    function GeneratorFunctionPrototype() {}
    var IteratorPrototype = {};
    define(IteratorPrototype, iteratorSymbol, function () {
      return this;
    });
    var getProto = Object.getPrototypeOf,
      NativeIteratorPrototype = getProto && getProto(getProto(values([])));
    NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype);
    var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);
    function defineIteratorMethods(prototype) {
      ["next", "throw", "return"].forEach(function (method) {
        define(prototype, method, function (arg) {
          return this._invoke(method, arg);
        });
      });
    }
    function AsyncIterator(generator, PromiseImpl) {
      function invoke(method, arg, resolve, reject) {
        var record = tryCatch(generator[method], generator, arg);
        if ("throw" !== record.type) {
          var result = record.arg,
            value = result.value;
          return value && "object" == typeof value && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function (value) {
            invoke("next", value, resolve, reject);
          }, function (err) {
            invoke("throw", err, resolve, reject);
          }) : PromiseImpl.resolve(value).then(function (unwrapped) {
            result.value = unwrapped, resolve(result);
          }, function (error) {
            return invoke("throw", error, resolve, reject);
          });
        }
        reject(record.arg);
      }
      var previousPromise;
      defineProperty(this, "_invoke", {
        value: function (method, arg) {
          function callInvokeWithMethodAndArg() {
            return new PromiseImpl(function (resolve, reject) {
              invoke(method, arg, resolve, reject);
            });
          }
          return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
        }
      });
    }
    function makeInvokeMethod(innerFn, self, context) {
      var state = "suspendedStart";
      return function (method, arg) {
        if ("executing" === state) throw new Error("Generator is already running");
        if ("completed" === state) {
          if ("throw" === method) throw arg;
          return doneResult();
        }
        for (context.method = method, context.arg = arg;;) {
          var delegate = context.delegate;
          if (delegate) {
            var delegateResult = maybeInvokeDelegate(delegate, context);
            if (delegateResult) {
              if (delegateResult === ContinueSentinel) continue;
              return delegateResult;
            }
          }
          if ("next" === context.method) context.sent = context._sent = context.arg;else if ("throw" === context.method) {
            if ("suspendedStart" === state) throw state = "completed", context.arg;
            context.dispatchException(context.arg);
          } else "return" === context.method && context.abrupt("return", context.arg);
          state = "executing";
          var record = tryCatch(innerFn, self, context);
          if ("normal" === record.type) {
            if (state = context.done ? "completed" : "suspendedYield", record.arg === ContinueSentinel) continue;
            return {
              value: record.arg,
              done: context.done
            };
          }
          "throw" === record.type && (state = "completed", context.method = "throw", context.arg = record.arg);
        }
      };
    }
    function maybeInvokeDelegate(delegate, context) {
      var methodName = context.method,
        method = delegate.iterator[methodName];
      if (undefined === method) return context.delegate = null, "throw" === methodName && delegate.iterator.return && (context.method = "return", context.arg = undefined, maybeInvokeDelegate(delegate, context), "throw" === context.method) || "return" !== methodName && (context.method = "throw", context.arg = new TypeError("The iterator does not provide a '" + methodName + "' method")), ContinueSentinel;
      var record = tryCatch(method, delegate.iterator, context.arg);
      if ("throw" === record.type) return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel;
      var info = record.arg;
      return info ? info.done ? (context[delegate.resultName] = info.value, context.next = delegate.nextLoc, "return" !== context.method && (context.method = "next", context.arg = undefined), context.delegate = null, ContinueSentinel) : info : (context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel);
    }
    function pushTryEntry(locs) {
      var entry = {
        tryLoc: locs[0]
      };
      1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry);
    }
    function resetTryEntry(entry) {
      var record = entry.completion || {};
      record.type = "normal", delete record.arg, entry.completion = record;
    }
    function Context(tryLocsList) {
      this.tryEntries = [{
        tryLoc: "root"
      }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0);
    }
    function values(iterable) {
      if (iterable) {
        var iteratorMethod = iterable[iteratorSymbol];
        if (iteratorMethod) return iteratorMethod.call(iterable);
        if ("function" == typeof iterable.next) return iterable;
        if (!isNaN(iterable.length)) {
          var i = -1,
            next = function next() {
              for (; ++i < iterable.length;) if (hasOwn.call(iterable, i)) return next.value = iterable[i], next.done = !1, next;
              return next.value = undefined, next.done = !0, next;
            };
          return next.next = next;
        }
      }
      return {
        next: doneResult
      };
    }
    function doneResult() {
      return {
        value: undefined,
        done: !0
      };
    }
    return GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", {
      value: GeneratorFunctionPrototype,
      configurable: !0
    }), defineProperty(GeneratorFunctionPrototype, "constructor", {
      value: GeneratorFunction,
      configurable: !0
    }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, toStringTagSymbol, "GeneratorFunction"), exports.isGeneratorFunction = function (genFun) {
      var ctor = "function" == typeof genFun && genFun.constructor;
      return !!ctor && (ctor === GeneratorFunction || "GeneratorFunction" === (ctor.displayName || ctor.name));
    }, exports.mark = function (genFun) {
      return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun;
    }, exports.awrap = function (arg) {
      return {
        __await: arg
      };
    }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function () {
      return this;
    }), exports.AsyncIterator = AsyncIterator, exports.async = function (innerFn, outerFn, self, tryLocsList, PromiseImpl) {
      void 0 === PromiseImpl && (PromiseImpl = Promise);
      var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
      return exports.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) {
        return result.done ? result.value : iter.next();
      });
    }, defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function () {
      return this;
    }), define(Gp, "toString", function () {
      return "[object Generator]";
    }), exports.keys = function (val) {
      var object = Object(val),
        keys = [];
      for (var key in object) keys.push(key);
      return keys.reverse(), function next() {
        for (; keys.length;) {
          var key = keys.pop();
          if (key in object) return next.value = key, next.done = !1, next;
        }
        return next.done = !0, next;
      };
    }, exports.values = values, Context.prototype = {
      constructor: Context,
      reset: function (skipTempReset) {
        if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined, this.tryEntries.forEach(resetTryEntry), !skipTempReset) for (var name in this) "t" === name.charAt(0) && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined);
      },
      stop: function () {
        this.done = !0;
        var rootRecord = this.tryEntries[0].completion;
        if ("throw" === rootRecord.type) throw rootRecord.arg;
        return this.rval;
      },
      dispatchException: function (exception) {
        if (this.done) throw exception;
        var context = this;
        function handle(loc, caught) {
          return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined), !!caught;
        }
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i],
            record = entry.completion;
          if ("root" === entry.tryLoc) return handle("end");
          if (entry.tryLoc <= this.prev) {
            var hasCatch = hasOwn.call(entry, "catchLoc"),
              hasFinally = hasOwn.call(entry, "finallyLoc");
            if (hasCatch && hasFinally) {
              if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
              if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
            } else if (hasCatch) {
              if (this.prev < entry.catchLoc) return handle(entry.catchLoc, !0);
            } else {
              if (!hasFinally) throw new Error("try statement without catch or finally");
              if (this.prev < entry.finallyLoc) return handle(entry.finallyLoc);
            }
          }
        }
      },
      abrupt: function (type, arg) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i];
          if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
            var finallyEntry = entry;
            break;
          }
        }
        finallyEntry && ("break" === type || "continue" === type) && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null);
        var record = finallyEntry ? finallyEntry.completion : {};
        return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record);
      },
      complete: function (record, afterLoc) {
        if ("throw" === record.type) throw record.arg;
        return "break" === record.type || "continue" === record.type ? this.next = record.arg : "return" === record.type ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : "normal" === record.type && afterLoc && (this.next = afterLoc), ContinueSentinel;
      },
      finish: function (finallyLoc) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i];
          if (entry.finallyLoc === finallyLoc) return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel;
        }
      },
      catch: function (tryLoc) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
          var entry = this.tryEntries[i];
          if (entry.tryLoc === tryLoc) {
            var record = entry.completion;
            if ("throw" === record.type) {
              var thrown = record.arg;
              resetTryEntry(entry);
            }
            return thrown;
          }
        }
        throw new Error("illegal catch attempt");
      },
      delegateYield: function (iterable, resultName, nextLoc) {
        return this.delegate = {
          iterator: values(iterable),
          resultName: resultName,
          nextLoc: nextLoc
        }, "next" === this.method && (this.arg = undefined), ContinueSentinel;
      }
    }, exports;
  }
  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
      var info = gen[key](arg);
      var value = info.value;
    } catch (error) {
      reject(error);
      return;
    }
    if (info.done) {
      resolve(value);
    } else {
      Promise.resolve(value).then(_next, _throw);
    }
  }
  function _asyncToGenerator(fn) {
    return function () {
      var self = this,
        args = arguments;
      return new Promise(function (resolve, reject) {
        var gen = fn.apply(self, args);
        function _next(value) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
        }
        function _throw(err) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
        }
        _next(undefined);
      });
    };
  }
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    Object.defineProperty(Constructor, "prototype", {
      writable: false
    });
    return Constructor;
  }
  function _defineProperty(obj, key, value) {
    key = _toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
  }
  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }
  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }
  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }
  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
  }
  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }
  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
    return arr2;
  }
  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  function _createForOfIteratorHelper(o, allowArrayLike) {
    var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
    if (!it) {
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;
        var F = function () {};
        return {
          s: F,
          n: function () {
            if (i >= o.length) return {
              done: true
            };
            return {
              done: false,
              value: o[i++]
            };
          },
          e: function (e) {
            throw e;
          },
          f: F
        };
      }
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    var normalCompletion = true,
      didErr = false,
      err;
    return {
      s: function () {
        it = it.call(o);
      },
      n: function () {
        var step = it.next();
        normalCompletion = step.done;
        return step;
      },
      e: function (e) {
        didErr = true;
        err = e;
      },
      f: function () {
        try {
          if (!normalCompletion && it.return != null) it.return();
        } finally {
          if (didErr) throw err;
        }
      }
    };
  }
  function _toPrimitive(input, hint) {
    if (typeof input !== "object" || input === null) return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== undefined) {
      var res = prim.call(input, hint || "default");
      if (typeof res !== "object") return res;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
  }
  function _toPropertyKey(arg) {
    var key = _toPrimitive(arg, "string");
    return typeof key === "symbol" ? key : String(key);
  }

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

  function getCookie(name) {
    var value = "; ".concat(document.cookie);
    var parts = value.split("; ".concat(name, "="));
    if (parts.length === 2) return parts.pop().split(';').shift();
  }
  function getJwtToken() {
    return localStorage.getItem('jwt') || getCookie('user');
  }

  var ins = axios$1.create({
    baseURL: '/api',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  ins.interceptors.request.use(function (config) {
    var token = getJwtToken();
    if (token) {
      config.headers['Authorization'] = "Bearer ".concat(token);
    }
    return config;
  }, function (error) {
    Promise.reject(error);
  });
  var api = ins;

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  /* eslint-disable no-multi-assign */
  function deepFreeze(obj) {
    if (obj instanceof Map) {
      obj.clear = obj.delete = obj.set = function () {
        throw new Error('map is read-only');
      };
    } else if (obj instanceof Set) {
      obj.add = obj.clear = obj.delete = function () {
        throw new Error('set is read-only');
      };
    }

    // Freeze self
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(name => {
      const prop = obj[name];
      const type = typeof prop;

      // Freeze prop if it is an object or function and also not already frozen
      if ((type === 'object' || type === 'function') && !Object.isFrozen(prop)) {
        deepFreeze(prop);
      }
    });
    return obj;
  }

  /** @typedef {import('highlight.js').CallbackResponse} CallbackResponse */
  /** @typedef {import('highlight.js').CompiledMode} CompiledMode */
  /** @implements CallbackResponse */

  class Response {
    /**
     * @param {CompiledMode} mode
     */
    constructor(mode) {
      // eslint-disable-next-line no-undefined
      if (mode.data === undefined) mode.data = {};
      this.data = mode.data;
      this.isMatchIgnored = false;
    }
    ignoreMatch() {
      this.isMatchIgnored = true;
    }
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  function escapeHTML(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  }

  /**
   * performs a shallow merge of multiple objects into one
   *
   * @template T
   * @param {T} original
   * @param {Record<string,any>[]} objects
   * @returns {T} a single new object
   */
  function inherit$1(original, ...objects) {
    /** @type Record<string,any> */
    const result = Object.create(null);
    for (const key in original) {
      result[key] = original[key];
    }
    objects.forEach(function (obj) {
      for (const key in obj) {
        result[key] = obj[key];
      }
    });
    return (/** @type {T} */result
    );
  }

  /**
   * @typedef {object} Renderer
   * @property {(text: string) => void} addText
   * @property {(node: Node) => void} openNode
   * @property {(node: Node) => void} closeNode
   * @property {() => string} value
   */

  /** @typedef {{scope?: string, language?: string, sublanguage?: boolean}} Node */
  /** @typedef {{walk: (r: Renderer) => void}} Tree */
  /** */

  const SPAN_CLOSE = '</span>';

  /**
   * Determines if a node needs to be wrapped in <span>
   *
   * @param {Node} node */
  const emitsWrappingTags = node => {
    // rarely we can have a sublanguage where language is undefined
    // TODO: track down why
    return !!node.scope;
  };

  /**
   *
   * @param {string} name
   * @param {{prefix:string}} options
   */
  const scopeToCSSClass = (name, {
    prefix
  }) => {
    // sub-language
    if (name.startsWith("language:")) {
      return name.replace("language:", "language-");
    }
    // tiered scope: comment.line
    if (name.includes(".")) {
      const pieces = name.split(".");
      return [`${prefix}${pieces.shift()}`, ...pieces.map((x, i) => `${x}${"_".repeat(i + 1)}`)].join(" ");
    }
    // simple scope
    return `${prefix}${name}`;
  };

  /** @type {Renderer} */
  class HTMLRenderer {
    /**
     * Creates a new HTMLRenderer
     *
     * @param {Tree} parseTree - the parse tree (must support `walk` API)
     * @param {{classPrefix: string}} options
     */
    constructor(parseTree, options) {
      this.buffer = "";
      this.classPrefix = options.classPrefix;
      parseTree.walk(this);
    }

    /**
     * Adds texts to the output stream
     *
     * @param {string} text */
    addText(text) {
      this.buffer += escapeHTML(text);
    }

    /**
     * Adds a node open to the output stream (if needed)
     *
     * @param {Node} node */
    openNode(node) {
      if (!emitsWrappingTags(node)) return;
      const className = scopeToCSSClass(node.scope, {
        prefix: this.classPrefix
      });
      this.span(className);
    }

    /**
     * Adds a node close to the output stream (if needed)
     *
     * @param {Node} node */
    closeNode(node) {
      if (!emitsWrappingTags(node)) return;
      this.buffer += SPAN_CLOSE;
    }

    /**
     * returns the accumulated buffer
    */
    value() {
      return this.buffer;
    }

    // helpers

    /**
     * Builds a span element
     *
     * @param {string} className */
    span(className) {
      this.buffer += `<span class="${className}">`;
    }
  }

  /** @typedef {{scope?: string, language?: string, sublanguage?: boolean, children: Node[]} | string} Node */
  /** @typedef {{scope?: string, language?: string, sublanguage?: boolean, children: Node[]} } DataNode */
  /** @typedef {import('highlight.js').Emitter} Emitter */
  /**  */

  /** @returns {DataNode} */
  const newNode = (opts = {}) => {
    /** @type DataNode */
    const result = {
      children: []
    };
    Object.assign(result, opts);
    return result;
  };
  class TokenTree {
    constructor() {
      /** @type DataNode */
      this.rootNode = newNode();
      this.stack = [this.rootNode];
    }
    get top() {
      return this.stack[this.stack.length - 1];
    }
    get root() {
      return this.rootNode;
    }

    /** @param {Node} node */
    add(node) {
      this.top.children.push(node);
    }

    /** @param {string} scope */
    openNode(scope) {
      /** @type Node */
      const node = newNode({
        scope
      });
      this.add(node);
      this.stack.push(node);
    }
    closeNode() {
      if (this.stack.length > 1) {
        return this.stack.pop();
      }
      // eslint-disable-next-line no-undefined
      return undefined;
    }
    closeAllNodes() {
      while (this.closeNode());
    }
    toJSON() {
      return JSON.stringify(this.rootNode, null, 4);
    }

    /**
     * @typedef { import("./html_renderer").Renderer } Renderer
     * @param {Renderer} builder
     */
    walk(builder) {
      // this does not
      return this.constructor._walk(builder, this.rootNode);
      // this works
      // return TokenTree._walk(builder, this.rootNode);
    }

    /**
     * @param {Renderer} builder
     * @param {Node} node
     */
    static _walk(builder, node) {
      if (typeof node === "string") {
        builder.addText(node);
      } else if (node.children) {
        builder.openNode(node);
        node.children.forEach(child => this._walk(builder, child));
        builder.closeNode(node);
      }
      return builder;
    }

    /**
     * @param {Node} node
     */
    static _collapse(node) {
      if (typeof node === "string") return;
      if (!node.children) return;
      if (node.children.every(el => typeof el === "string")) {
        // node.text = node.children.join("");
        // delete node.children;
        node.children = [node.children.join("")];
      } else {
        node.children.forEach(child => {
          TokenTree._collapse(child);
        });
      }
    }
  }

  /**
    Currently this is all private API, but this is the minimal API necessary
    that an Emitter must implement to fully support the parser.

    Minimal interface:

    - addText(text)
    - __addSublanguage(emitter, subLanguageName)
    - startScope(scope)
    - endScope()
    - finalize()
    - toHTML()

  */

  /**
   * @implements {Emitter}
   */
  class TokenTreeEmitter extends TokenTree {
    /**
     * @param {*} options
     */
    constructor(options) {
      super();
      this.options = options;
    }

    /**
     * @param {string} text
     */
    addText(text) {
      if (text === "") {
        return;
      }
      this.add(text);
    }

    /** @param {string} scope */
    startScope(scope) {
      this.openNode(scope);
    }
    endScope() {
      this.closeNode();
    }

    /**
     * @param {Emitter & {root: DataNode}} emitter
     * @param {string} name
     */
    __addSublanguage(emitter, name) {
      /** @type DataNode */
      const node = emitter.root;
      if (name) node.scope = `language:${name}`;
      this.add(node);
    }
    toHTML() {
      const renderer = new HTMLRenderer(this, this.options);
      return renderer.value();
    }
    finalize() {
      this.closeAllNodes();
      return true;
    }
  }

  /**
   * @param {string} value
   * @returns {RegExp}
   * */

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function source(re) {
    if (!re) return null;
    if (typeof re === "string") return re;
    return re.source;
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function lookahead(re) {
    return concat('(?=', re, ')');
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function anyNumberOfTimes(re) {
    return concat('(?:', re, ')*');
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function optional(re) {
    return concat('(?:', re, ')?');
  }

  /**
   * @param {...(RegExp | string) } args
   * @returns {string}
   */
  function concat(...args) {
    const joined = args.map(x => source(x)).join("");
    return joined;
  }

  /**
   * @param { Array<string | RegExp | Object> } args
   * @returns {object}
   */
  function stripOptionsFromArgs(args) {
    const opts = args[args.length - 1];
    if (typeof opts === 'object' && opts.constructor === Object) {
      args.splice(args.length - 1, 1);
      return opts;
    } else {
      return {};
    }
  }

  /** @typedef { {capture?: boolean} } RegexEitherOptions */

  /**
   * Any of the passed expresssions may match
   *
   * Creates a huge this | this | that | that match
   * @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
   * @returns {string}
   */
  function either(...args) {
    /** @type { object & {capture?: boolean} }  */
    const opts = stripOptionsFromArgs(args);
    const joined = '(' + (opts.capture ? "" : "?:") + args.map(x => source(x)).join("|") + ")";
    return joined;
  }

  /**
   * @param {RegExp | string} re
   * @returns {number}
   */
  function countMatchGroups(re) {
    return new RegExp(re.toString() + '|').exec('').length - 1;
  }

  /**
   * Does lexeme start with a regular expression match at the beginning
   * @param {RegExp} re
   * @param {string} lexeme
   */
  function startsWith(re, lexeme) {
    const match = re && re.exec(lexeme);
    return match && match.index === 0;
  }

  // BACKREF_RE matches an open parenthesis or backreference. To avoid
  // an incorrect parse, it additionally matches the following:
  // - [...] elements, where the meaning of parentheses and escapes change
  // - other escape sequences, so we do not misparse escape sequences as
  //   interesting elements
  // - non-matching or lookahead parentheses, which do not capture. These
  //   follow the '(' with a '?'.
  const BACKREF_RE = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;

  // **INTERNAL** Not intended for outside usage
  // join logically computes regexps.join(separator), but fixes the
  // backreferences so they continue to match.
  // it also places each individual regular expression into it's own
  // match group, keeping track of the sequencing of those match groups
  // is currently an exercise for the caller. :-)
  /**
   * @param {(string | RegExp)[]} regexps
   * @param {{joinWith: string}} opts
   * @returns {string}
   */
  function _rewriteBackreferences(regexps, {
    joinWith
  }) {
    let numCaptures = 0;
    return regexps.map(regex => {
      numCaptures += 1;
      const offset = numCaptures;
      let re = source(regex);
      let out = '';
      while (re.length > 0) {
        const match = BACKREF_RE.exec(re);
        if (!match) {
          out += re;
          break;
        }
        out += re.substring(0, match.index);
        re = re.substring(match.index + match[0].length);
        if (match[0][0] === '\\' && match[1]) {
          // Adjust the backreference.
          out += '\\' + String(Number(match[1]) + offset);
        } else {
          out += match[0];
          if (match[0] === '(') {
            numCaptures++;
          }
        }
      }
      return out;
    }).map(re => `(${re})`).join(joinWith);
  }

  /** @typedef {import('highlight.js').Mode} Mode */
  /** @typedef {import('highlight.js').ModeCallback} ModeCallback */

  // Common regexps
  const MATCH_NOTHING_RE = /\b\B/;
  const IDENT_RE = '[a-zA-Z]\\w*';
  const UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
  const NUMBER_RE = '\\b\\d+(\\.\\d+)?';
  const C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
  const BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
  const RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

  /**
  * @param { Partial<Mode> & {binary?: string | RegExp} } opts
  */
  const SHEBANG = (opts = {}) => {
    const beginShebang = /^#![ ]*\//;
    if (opts.binary) {
      opts.begin = concat(beginShebang, /.*\b/, opts.binary, /\b.*/);
    }
    return inherit$1({
      scope: 'meta',
      begin: beginShebang,
      end: /$/,
      relevance: 0,
      /** @type {ModeCallback} */
      "on:begin": (m, resp) => {
        if (m.index !== 0) resp.ignoreMatch();
      }
    }, opts);
  };

  // Common modes
  const BACKSLASH_ESCAPE = {
    begin: '\\\\[\\s\\S]',
    relevance: 0
  };
  const APOS_STRING_MODE = {
    scope: 'string',
    begin: '\'',
    end: '\'',
    illegal: '\\n',
    contains: [BACKSLASH_ESCAPE]
  };
  const QUOTE_STRING_MODE = {
    scope: 'string',
    begin: '"',
    end: '"',
    illegal: '\\n',
    contains: [BACKSLASH_ESCAPE]
  };
  const PHRASAL_WORDS_MODE = {
    begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
  };
  /**
   * Creates a comment mode
   *
   * @param {string | RegExp} begin
   * @param {string | RegExp} end
   * @param {Mode | {}} [modeOptions]
   * @returns {Partial<Mode>}
   */
  const COMMENT = function (begin, end, modeOptions = {}) {
    const mode = inherit$1({
      scope: 'comment',
      begin,
      end,
      contains: []
    }, modeOptions);
    mode.contains.push({
      scope: 'doctag',
      // hack to avoid the space from being included. the space is necessary to
      // match here to prevent the plain text rule below from gobbling up doctags
      begin: '[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)',
      end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
      excludeBegin: true,
      relevance: 0
    });
    const ENGLISH_WORD = either(
    // list of common 1 and 2 letter words in English
    "I", "a", "is", "so", "us", "to", "at", "if", "in", "it", "on",
    // note: this is not an exhaustive list of contractions, just popular ones
    /[A-Za-z]+['](d|ve|re|ll|t|s|n)/,
    // contractions - can't we'd they're let's, etc
    /[A-Za-z]+[-][a-z]+/,
    // `no-way`, etc.
    /[A-Za-z][a-z]{2,}/ // allow capitalized words at beginning of sentences
    );
    // looking like plain text, more likely to be a comment
    mode.contains.push({
      // TODO: how to include ", (, ) without breaking grammars that use these for
      // comment delimiters?
      // begin: /[ ]+([()"]?([A-Za-z'-]{3,}|is|a|I|so|us|[tT][oO]|at|if|in|it|on)[.]?[()":]?([.][ ]|[ ]|\))){3}/
      // ---

      // this tries to find sequences of 3 english words in a row (without any
      // "programming" type syntax) this gives us a strong signal that we've
      // TRULY found a comment - vs perhaps scanning with the wrong language.
      // It's possible to find something that LOOKS like the start of the
      // comment - but then if there is no readable text - good chance it is a
      // false match and not a comment.
      //
      // for a visual example please see:
      // https://github.com/highlightjs/highlight.js/issues/2827

      begin: concat(/[ ]+/,
      // necessary to prevent us gobbling up doctags like /* @author Bob Mcgill */
      '(', ENGLISH_WORD, /[.]?[:]?([.][ ]|[ ])/, '){3}') // look for 3 words in a row
    });

    return mode;
  };
  const C_LINE_COMMENT_MODE = COMMENT('//', '$');
  const C_BLOCK_COMMENT_MODE = COMMENT('/\\*', '\\*/');
  const HASH_COMMENT_MODE = COMMENT('#', '$');
  const NUMBER_MODE = {
    scope: 'number',
    begin: NUMBER_RE,
    relevance: 0
  };
  const C_NUMBER_MODE = {
    scope: 'number',
    begin: C_NUMBER_RE,
    relevance: 0
  };
  const BINARY_NUMBER_MODE = {
    scope: 'number',
    begin: BINARY_NUMBER_RE,
    relevance: 0
  };
  const REGEXP_MODE = {
    // this outer rule makes sure we actually have a WHOLE regex and not simply
    // an expression such as:
    //
    //     3 / something
    //
    // (which will then blow up when regex's `illegal` sees the newline)
    begin: /(?=\/[^/\n]*\/)/,
    contains: [{
      scope: 'regexp',
      begin: /\//,
      end: /\/[gimuy]*/,
      illegal: /\n/,
      contains: [BACKSLASH_ESCAPE, {
        begin: /\[/,
        end: /\]/,
        relevance: 0,
        contains: [BACKSLASH_ESCAPE]
      }]
    }]
  };
  const TITLE_MODE = {
    scope: 'title',
    begin: IDENT_RE,
    relevance: 0
  };
  const UNDERSCORE_TITLE_MODE = {
    scope: 'title',
    begin: UNDERSCORE_IDENT_RE,
    relevance: 0
  };
  const METHOD_GUARD = {
    // excludes method names from keyword processing
    begin: '\\.\\s*' + UNDERSCORE_IDENT_RE,
    relevance: 0
  };

  /**
   * Adds end same as begin mechanics to a mode
   *
   * Your mode must include at least a single () match group as that first match
   * group is what is used for comparison
   * @param {Partial<Mode>} mode
   */
  const END_SAME_AS_BEGIN = function (mode) {
    return Object.assign(mode, {
      /** @type {ModeCallback} */
      'on:begin': (m, resp) => {
        resp.data._beginMatch = m[1];
      },
      /** @type {ModeCallback} */
      'on:end': (m, resp) => {
        if (resp.data._beginMatch !== m[1]) resp.ignoreMatch();
      }
    });
  };
  var MODES = /*#__PURE__*/Object.freeze({
    __proto__: null,
    MATCH_NOTHING_RE: MATCH_NOTHING_RE,
    IDENT_RE: IDENT_RE,
    UNDERSCORE_IDENT_RE: UNDERSCORE_IDENT_RE,
    NUMBER_RE: NUMBER_RE,
    C_NUMBER_RE: C_NUMBER_RE,
    BINARY_NUMBER_RE: BINARY_NUMBER_RE,
    RE_STARTERS_RE: RE_STARTERS_RE,
    SHEBANG: SHEBANG,
    BACKSLASH_ESCAPE: BACKSLASH_ESCAPE,
    APOS_STRING_MODE: APOS_STRING_MODE,
    QUOTE_STRING_MODE: QUOTE_STRING_MODE,
    PHRASAL_WORDS_MODE: PHRASAL_WORDS_MODE,
    COMMENT: COMMENT,
    C_LINE_COMMENT_MODE: C_LINE_COMMENT_MODE,
    C_BLOCK_COMMENT_MODE: C_BLOCK_COMMENT_MODE,
    HASH_COMMENT_MODE: HASH_COMMENT_MODE,
    NUMBER_MODE: NUMBER_MODE,
    C_NUMBER_MODE: C_NUMBER_MODE,
    BINARY_NUMBER_MODE: BINARY_NUMBER_MODE,
    REGEXP_MODE: REGEXP_MODE,
    TITLE_MODE: TITLE_MODE,
    UNDERSCORE_TITLE_MODE: UNDERSCORE_TITLE_MODE,
    METHOD_GUARD: METHOD_GUARD,
    END_SAME_AS_BEGIN: END_SAME_AS_BEGIN
  });

  /**
  @typedef {import('highlight.js').CallbackResponse} CallbackResponse
  @typedef {import('highlight.js').CompilerExt} CompilerExt
  */

  // Grammar extensions / plugins
  // See: https://github.com/highlightjs/highlight.js/issues/2833

  // Grammar extensions allow "syntactic sugar" to be added to the grammar modes
  // without requiring any underlying changes to the compiler internals.

  // `compileMatch` being the perfect small example of now allowing a grammar
  // author to write `match` when they desire to match a single expression rather
  // than being forced to use `begin`.  The extension then just moves `match` into
  // `begin` when it runs.  Ie, no features have been added, but we've just made
  // the experience of writing (and reading grammars) a little bit nicer.

  // ------

  // TODO: We need negative look-behind support to do this properly
  /**
   * Skip a match if it has a preceding dot
   *
   * This is used for `beginKeywords` to prevent matching expressions such as
   * `bob.keyword.do()`. The mode compiler automatically wires this up as a
   * special _internal_ 'on:begin' callback for modes with `beginKeywords`
   * @param {RegExpMatchArray} match
   * @param {CallbackResponse} response
   */
  function skipIfHasPrecedingDot(match, response) {
    const before = match.input[match.index - 1];
    if (before === ".") {
      response.ignoreMatch();
    }
  }

  /**
   *
   * @type {CompilerExt}
   */
  function scopeClassName(mode, _parent) {
    // eslint-disable-next-line no-undefined
    if (mode.className !== undefined) {
      mode.scope = mode.className;
      delete mode.className;
    }
  }

  /**
   * `beginKeywords` syntactic sugar
   * @type {CompilerExt}
   */
  function beginKeywords(mode, parent) {
    if (!parent) return;
    if (!mode.beginKeywords) return;

    // for languages with keywords that include non-word characters checking for
    // a word boundary is not sufficient, so instead we check for a word boundary
    // or whitespace - this does no harm in any case since our keyword engine
    // doesn't allow spaces in keywords anyways and we still check for the boundary
    // first
    mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')(?!\\.)(?=\\b|\\s)';
    mode.__beforeBegin = skipIfHasPrecedingDot;
    mode.keywords = mode.keywords || mode.beginKeywords;
    delete mode.beginKeywords;

    // prevents double relevance, the keywords themselves provide
    // relevance, the mode doesn't need to double it
    // eslint-disable-next-line no-undefined
    if (mode.relevance === undefined) mode.relevance = 0;
  }

  /**
   * Allow `illegal` to contain an array of illegal values
   * @type {CompilerExt}
   */
  function compileIllegal(mode, _parent) {
    if (!Array.isArray(mode.illegal)) return;
    mode.illegal = either(...mode.illegal);
  }

  /**
   * `match` to match a single expression for readability
   * @type {CompilerExt}
   */
  function compileMatch(mode, _parent) {
    if (!mode.match) return;
    if (mode.begin || mode.end) throw new Error("begin & end are not supported with match");
    mode.begin = mode.match;
    delete mode.match;
  }

  /**
   * provides the default 1 relevance to all modes
   * @type {CompilerExt}
   */
  function compileRelevance(mode, _parent) {
    // eslint-disable-next-line no-undefined
    if (mode.relevance === undefined) mode.relevance = 1;
  }

  // allow beforeMatch to act as a "qualifier" for the match
  // the full match begin must be [beforeMatch][begin]
  const beforeMatchExt = (mode, parent) => {
    if (!mode.beforeMatch) return;
    // starts conflicts with endsParent which we need to make sure the child
    // rule is not matched multiple times
    if (mode.starts) throw new Error("beforeMatch cannot be used with starts");
    const originalMode = Object.assign({}, mode);
    Object.keys(mode).forEach(key => {
      delete mode[key];
    });
    mode.keywords = originalMode.keywords;
    mode.begin = concat(originalMode.beforeMatch, lookahead(originalMode.begin));
    mode.starts = {
      relevance: 0,
      contains: [Object.assign(originalMode, {
        endsParent: true
      })]
    };
    mode.relevance = 0;
    delete originalMode.beforeMatch;
  };

  // keywords that should have no default relevance value
  const COMMON_KEYWORDS = ['of', 'and', 'for', 'in', 'not', 'or', 'if', 'then', 'parent',
  // common variable name
  'list',
  // common variable name
  'value' // common variable name
  ];

  const DEFAULT_KEYWORD_SCOPE = "keyword";

  /**
   * Given raw keywords from a language definition, compile them.
   *
   * @param {string | Record<string,string|string[]> | Array<string>} rawKeywords
   * @param {boolean} caseInsensitive
   */
  function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
    /** @type {import("highlight.js/private").KeywordDict} */
    const compiledKeywords = Object.create(null);

    // input can be a string of keywords, an array of keywords, or a object with
    // named keys representing scopeName (which can then point to a string or array)
    if (typeof rawKeywords === 'string') {
      compileList(scopeName, rawKeywords.split(" "));
    } else if (Array.isArray(rawKeywords)) {
      compileList(scopeName, rawKeywords);
    } else {
      Object.keys(rawKeywords).forEach(function (scopeName) {
        // collapse all our objects back into the parent object
        Object.assign(compiledKeywords, compileKeywords(rawKeywords[scopeName], caseInsensitive, scopeName));
      });
    }
    return compiledKeywords;

    // ---

    /**
     * Compiles an individual list of keywords
     *
     * Ex: "for if when while|5"
     *
     * @param {string} scopeName
     * @param {Array<string>} keywordList
     */
    function compileList(scopeName, keywordList) {
      if (caseInsensitive) {
        keywordList = keywordList.map(x => x.toLowerCase());
      }
      keywordList.forEach(function (keyword) {
        const pair = keyword.split('|');
        compiledKeywords[pair[0]] = [scopeName, scoreForKeyword(pair[0], pair[1])];
      });
    }
  }

  /**
   * Returns the proper score for a given keyword
   *
   * Also takes into account comment keywords, which will be scored 0 UNLESS
   * another score has been manually assigned.
   * @param {string} keyword
   * @param {string} [providedScore]
   */
  function scoreForKeyword(keyword, providedScore) {
    // manual scores always win over common keywords
    // so you can force a score of 1 if you really insist
    if (providedScore) {
      return Number(providedScore);
    }
    return commonKeyword(keyword) ? 0 : 1;
  }

  /**
   * Determines if a given keyword is common or not
   *
   * @param {string} keyword */
  function commonKeyword(keyword) {
    return COMMON_KEYWORDS.includes(keyword.toLowerCase());
  }

  /*

  For the reasoning behind this please see:
  https://github.com/highlightjs/highlight.js/issues/2880#issuecomment-747275419

  */

  /**
   * @type {Record<string, boolean>}
   */
  const seenDeprecations = {};

  /**
   * @param {string} message
   */
  const error$1 = message => {
    console.error(message);
  };

  /**
   * @param {string} message
   * @param {any} args
   */
  const warn = (message, ...args) => {
    console.log(`WARN: ${message}`, ...args);
  };

  /**
   * @param {string} version
   * @param {string} message
   */
  const deprecated = (version, message) => {
    if (seenDeprecations[`${version}/${message}`]) return;
    console.log(`Deprecated as of ${version}. ${message}`);
    seenDeprecations[`${version}/${message}`] = true;
  };

  /* eslint-disable no-throw-literal */

  /**
  @typedef {import('highlight.js').CompiledMode} CompiledMode
  */

  const MultiClassError = new Error();

  /**
   * Renumbers labeled scope names to account for additional inner match
   * groups that otherwise would break everything.
   *
   * Lets say we 3 match scopes:
   *
   *   { 1 => ..., 2 => ..., 3 => ... }
   *
   * So what we need is a clean match like this:
   *
   *   (a)(b)(c) => [ "a", "b", "c" ]
   *
   * But this falls apart with inner match groups:
   *
   * (a)(((b)))(c) => ["a", "b", "b", "b", "c" ]
   *
   * Our scopes are now "out of alignment" and we're repeating `b` 3 times.
   * What needs to happen is the numbers are remapped:
   *
   *   { 1 => ..., 2 => ..., 5 => ... }
   *
   * We also need to know that the ONLY groups that should be output
   * are 1, 2, and 5.  This function handles this behavior.
   *
   * @param {CompiledMode} mode
   * @param {Array<RegExp | string>} regexes
   * @param {{key: "beginScope"|"endScope"}} opts
   */
  function remapScopeNames(mode, regexes, {
    key
  }) {
    let offset = 0;
    const scopeNames = mode[key];
    /** @type Record<number,boolean> */
    const emit = {};
    /** @type Record<number,string> */
    const positions = {};
    for (let i = 1; i <= regexes.length; i++) {
      positions[i + offset] = scopeNames[i];
      emit[i + offset] = true;
      offset += countMatchGroups(regexes[i - 1]);
    }
    // we use _emit to keep track of which match groups are "top-level" to avoid double
    // output from inside match groups
    mode[key] = positions;
    mode[key]._emit = emit;
    mode[key]._multi = true;
  }

  /**
   * @param {CompiledMode} mode
   */
  function beginMultiClass(mode) {
    if (!Array.isArray(mode.begin)) return;
    if (mode.skip || mode.excludeBegin || mode.returnBegin) {
      error$1("skip, excludeBegin, returnBegin not compatible with beginScope: {}");
      throw MultiClassError;
    }
    if (typeof mode.beginScope !== "object" || mode.beginScope === null) {
      error$1("beginScope must be object");
      throw MultiClassError;
    }
    remapScopeNames(mode, mode.begin, {
      key: "beginScope"
    });
    mode.begin = _rewriteBackreferences(mode.begin, {
      joinWith: ""
    });
  }

  /**
   * @param {CompiledMode} mode
   */
  function endMultiClass(mode) {
    if (!Array.isArray(mode.end)) return;
    if (mode.skip || mode.excludeEnd || mode.returnEnd) {
      error$1("skip, excludeEnd, returnEnd not compatible with endScope: {}");
      throw MultiClassError;
    }
    if (typeof mode.endScope !== "object" || mode.endScope === null) {
      error$1("endScope must be object");
      throw MultiClassError;
    }
    remapScopeNames(mode, mode.end, {
      key: "endScope"
    });
    mode.end = _rewriteBackreferences(mode.end, {
      joinWith: ""
    });
  }

  /**
   * this exists only to allow `scope: {}` to be used beside `match:`
   * Otherwise `beginScope` would necessary and that would look weird

    {
      match: [ /def/, /\w+/ ]
      scope: { 1: "keyword" , 2: "title" }
    }

   * @param {CompiledMode} mode
   */
  function scopeSugar(mode) {
    if (mode.scope && typeof mode.scope === "object" && mode.scope !== null) {
      mode.beginScope = mode.scope;
      delete mode.scope;
    }
  }

  /**
   * @param {CompiledMode} mode
   */
  function MultiClass(mode) {
    scopeSugar(mode);
    if (typeof mode.beginScope === "string") {
      mode.beginScope = {
        _wrap: mode.beginScope
      };
    }
    if (typeof mode.endScope === "string") {
      mode.endScope = {
        _wrap: mode.endScope
      };
    }
    beginMultiClass(mode);
    endMultiClass(mode);
  }

  /**
  @typedef {import('highlight.js').Mode} Mode
  @typedef {import('highlight.js').CompiledMode} CompiledMode
  @typedef {import('highlight.js').Language} Language
  @typedef {import('highlight.js').HLJSPlugin} HLJSPlugin
  @typedef {import('highlight.js').CompiledLanguage} CompiledLanguage
  */

  // compilation

  /**
   * Compiles a language definition result
   *
   * Given the raw result of a language definition (Language), compiles this so
   * that it is ready for highlighting code.
   * @param {Language} language
   * @returns {CompiledLanguage}
   */
  function compileLanguage(language) {
    /**
     * Builds a regex with the case sensitivity of the current language
     *
     * @param {RegExp | string} value
     * @param {boolean} [global]
     */
    function langRe(value, global) {
      return new RegExp(source(value), 'm' + (language.case_insensitive ? 'i' : '') + (language.unicodeRegex ? 'u' : '') + (global ? 'g' : ''));
    }

    /**
      Stores multiple regular expressions and allows you to quickly search for
      them all in a string simultaneously - returning the first match.  It does
      this by creating a huge (a|b|c) regex - each individual item wrapped with ()
      and joined by `|` - using match groups to track position.  When a match is
      found checking which position in the array has content allows us to figure
      out which of the original regexes / match groups triggered the match.
       The match object itself (the result of `Regex.exec`) is returned but also
      enhanced by merging in any meta-data that was registered with the regex.
      This is how we keep track of which mode matched, and what type of rule
      (`illegal`, `begin`, end, etc).
    */
    class MultiRegex {
      constructor() {
        this.matchIndexes = {};
        // @ts-ignore
        this.regexes = [];
        this.matchAt = 1;
        this.position = 0;
      }

      // @ts-ignore
      addRule(re, opts) {
        opts.position = this.position++;
        // @ts-ignore
        this.matchIndexes[this.matchAt] = opts;
        this.regexes.push([opts, re]);
        this.matchAt += countMatchGroups(re) + 1;
      }
      compile() {
        if (this.regexes.length === 0) {
          // avoids the need to check length every time exec is called
          // @ts-ignore
          this.exec = () => null;
        }
        const terminators = this.regexes.map(el => el[1]);
        this.matcherRe = langRe(_rewriteBackreferences(terminators, {
          joinWith: '|'
        }), true);
        this.lastIndex = 0;
      }

      /** @param {string} s */
      exec(s) {
        this.matcherRe.lastIndex = this.lastIndex;
        const match = this.matcherRe.exec(s);
        if (!match) {
          return null;
        }

        // eslint-disable-next-line no-undefined
        const i = match.findIndex((el, i) => i > 0 && el !== undefined);
        // @ts-ignore
        const matchData = this.matchIndexes[i];
        // trim off any earlier non-relevant match groups (ie, the other regex
        // match groups that make up the multi-matcher)
        match.splice(0, i);
        return Object.assign(match, matchData);
      }
    }

    /*
      Created to solve the key deficiently with MultiRegex - there is no way to
      test for multiple matches at a single location.  Why would we need to do
      that?  In the future a more dynamic engine will allow certain matches to be
      ignored.  An example: if we matched say the 3rd regex in a large group but
      decided to ignore it - we'd need to started testing again at the 4th
      regex... but MultiRegex itself gives us no real way to do that.
       So what this class creates MultiRegexs on the fly for whatever search
      position they are needed.
       NOTE: These additional MultiRegex objects are created dynamically.  For most
      grammars most of the time we will never actually need anything more than the
      first MultiRegex - so this shouldn't have too much overhead.
       Say this is our search group, and we match regex3, but wish to ignore it.
         regex1 | regex2 | regex3 | regex4 | regex5    ' ie, startAt = 0
       What we need is a new MultiRegex that only includes the remaining
      possibilities:
         regex4 | regex5                               ' ie, startAt = 3
       This class wraps all that complexity up in a simple API... `startAt` decides
      where in the array of expressions to start doing the matching. It
      auto-increments, so if a match is found at position 2, then startAt will be
      set to 3.  If the end is reached startAt will return to 0.
       MOST of the time the parser will be setting startAt manually to 0.
    */
    class ResumableMultiRegex {
      constructor() {
        // @ts-ignore
        this.rules = [];
        // @ts-ignore
        this.multiRegexes = [];
        this.count = 0;
        this.lastIndex = 0;
        this.regexIndex = 0;
      }

      // @ts-ignore
      getMatcher(index) {
        if (this.multiRegexes[index]) return this.multiRegexes[index];
        const matcher = new MultiRegex();
        this.rules.slice(index).forEach(([re, opts]) => matcher.addRule(re, opts));
        matcher.compile();
        this.multiRegexes[index] = matcher;
        return matcher;
      }
      resumingScanAtSamePosition() {
        return this.regexIndex !== 0;
      }
      considerAll() {
        this.regexIndex = 0;
      }

      // @ts-ignore
      addRule(re, opts) {
        this.rules.push([re, opts]);
        if (opts.type === "begin") this.count++;
      }

      /** @param {string} s */
      exec(s) {
        const m = this.getMatcher(this.regexIndex);
        m.lastIndex = this.lastIndex;
        let result = m.exec(s);

        // The following is because we have no easy way to say "resume scanning at the
        // existing position but also skip the current rule ONLY". What happens is
        // all prior rules are also skipped which can result in matching the wrong
        // thing. Example of matching "booger":

        // our matcher is [string, "booger", number]
        //
        // ....booger....

        // if "booger" is ignored then we'd really need a regex to scan from the
        // SAME position for only: [string, number] but ignoring "booger" (if it
        // was the first match), a simple resume would scan ahead who knows how
        // far looking only for "number", ignoring potential string matches (or
        // future "booger" matches that might be valid.)

        // So what we do: We execute two matchers, one resuming at the same
        // position, but the second full matcher starting at the position after:

        //     /--- resume first regex match here (for [number])
        //     |/---- full match here for [string, "booger", number]
        //     vv
        // ....booger....

        // Which ever results in a match first is then used. So this 3-4 step
        // process essentially allows us to say "match at this position, excluding
        // a prior rule that was ignored".
        //
        // 1. Match "booger" first, ignore. Also proves that [string] does non match.
        // 2. Resume matching for [number]
        // 3. Match at index + 1 for [string, "booger", number]
        // 4. If #2 and #3 result in matches, which came first?
        if (this.resumingScanAtSamePosition()) {
          if (result && result.index === this.lastIndex) ;else {
            // use the second matcher result
            const m2 = this.getMatcher(0);
            m2.lastIndex = this.lastIndex + 1;
            result = m2.exec(s);
          }
        }
        if (result) {
          this.regexIndex += result.position + 1;
          if (this.regexIndex === this.count) {
            // wrap-around to considering all matches again
            this.considerAll();
          }
        }
        return result;
      }
    }

    /**
     * Given a mode, builds a huge ResumableMultiRegex that can be used to walk
     * the content and find matches.
     *
     * @param {CompiledMode} mode
     * @returns {ResumableMultiRegex}
     */
    function buildModeRegex(mode) {
      const mm = new ResumableMultiRegex();
      mode.contains.forEach(term => mm.addRule(term.begin, {
        rule: term,
        type: "begin"
      }));
      if (mode.terminatorEnd) {
        mm.addRule(mode.terminatorEnd, {
          type: "end"
        });
      }
      if (mode.illegal) {
        mm.addRule(mode.illegal, {
          type: "illegal"
        });
      }
      return mm;
    }

    /** skip vs abort vs ignore
     *
     * @skip   - The mode is still entered and exited normally (and contains rules apply),
     *           but all content is held and added to the parent buffer rather than being
     *           output when the mode ends.  Mostly used with `sublanguage` to build up
     *           a single large buffer than can be parsed by sublanguage.
     *
     *             - The mode begin ands ends normally.
     *             - Content matched is added to the parent mode buffer.
     *             - The parser cursor is moved forward normally.
     *
     * @abort  - A hack placeholder until we have ignore.  Aborts the mode (as if it
     *           never matched) but DOES NOT continue to match subsequent `contains`
     *           modes.  Abort is bad/suboptimal because it can result in modes
     *           farther down not getting applied because an earlier rule eats the
     *           content but then aborts.
     *
     *             - The mode does not begin.
     *             - Content matched by `begin` is added to the mode buffer.
     *             - The parser cursor is moved forward accordingly.
     *
     * @ignore - Ignores the mode (as if it never matched) and continues to match any
     *           subsequent `contains` modes.  Ignore isn't technically possible with
     *           the current parser implementation.
     *
     *             - The mode does not begin.
     *             - Content matched by `begin` is ignored.
     *             - The parser cursor is not moved forward.
     */

    /**
     * Compiles an individual mode
     *
     * This can raise an error if the mode contains certain detectable known logic
     * issues.
     * @param {Mode} mode
     * @param {CompiledMode | null} [parent]
     * @returns {CompiledMode | never}
     */
    function compileMode(mode, parent) {
      const cmode = /** @type CompiledMode */mode;
      if (mode.isCompiled) return cmode;
      [scopeClassName,
      // do this early so compiler extensions generally don't have to worry about
      // the distinction between match/begin
      compileMatch, MultiClass, beforeMatchExt].forEach(ext => ext(mode, parent));
      language.compilerExtensions.forEach(ext => ext(mode, parent));

      // __beforeBegin is considered private API, internal use only
      mode.__beforeBegin = null;
      [beginKeywords,
      // do this later so compiler extensions that come earlier have access to the
      // raw array if they wanted to perhaps manipulate it, etc.
      compileIllegal,
      // default to 1 relevance if not specified
      compileRelevance].forEach(ext => ext(mode, parent));
      mode.isCompiled = true;
      let keywordPattern = null;
      if (typeof mode.keywords === "object" && mode.keywords.$pattern) {
        // we need a copy because keywords might be compiled multiple times
        // so we can't go deleting $pattern from the original on the first
        // pass
        mode.keywords = Object.assign({}, mode.keywords);
        keywordPattern = mode.keywords.$pattern;
        delete mode.keywords.$pattern;
      }
      keywordPattern = keywordPattern || /\w+/;
      if (mode.keywords) {
        mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);
      }
      cmode.keywordPatternRe = langRe(keywordPattern, true);
      if (parent) {
        if (!mode.begin) mode.begin = /\B|\b/;
        cmode.beginRe = langRe(cmode.begin);
        if (!mode.end && !mode.endsWithParent) mode.end = /\B|\b/;
        if (mode.end) cmode.endRe = langRe(cmode.end);
        cmode.terminatorEnd = source(cmode.end) || '';
        if (mode.endsWithParent && parent.terminatorEnd) {
          cmode.terminatorEnd += (mode.end ? '|' : '') + parent.terminatorEnd;
        }
      }
      if (mode.illegal) cmode.illegalRe = langRe( /** @type {RegExp | string} */mode.illegal);
      if (!mode.contains) mode.contains = [];
      mode.contains = [].concat(...mode.contains.map(function (c) {
        return expandOrCloneMode(c === 'self' ? mode : c);
      }));
      mode.contains.forEach(function (c) {
        compileMode( /** @type Mode */c, cmode);
      });
      if (mode.starts) {
        compileMode(mode.starts, parent);
      }
      cmode.matcher = buildModeRegex(cmode);
      return cmode;
    }
    if (!language.compilerExtensions) language.compilerExtensions = [];

    // self is not valid at the top-level
    if (language.contains && language.contains.includes('self')) {
      throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
    }

    // we need a null object, which inherit will guarantee
    language.classNameAliases = inherit$1(language.classNameAliases || {});
    return compileMode( /** @type Mode */language);
  }

  /**
   * Determines if a mode has a dependency on it's parent or not
   *
   * If a mode does have a parent dependency then often we need to clone it if
   * it's used in multiple places so that each copy points to the correct parent,
   * where-as modes without a parent can often safely be re-used at the bottom of
   * a mode chain.
   *
   * @param {Mode | null} mode
   * @returns {boolean} - is there a dependency on the parent?
   * */
  function dependencyOnParent(mode) {
    if (!mode) return false;
    return mode.endsWithParent || dependencyOnParent(mode.starts);
  }

  /**
   * Expands a mode or clones it if necessary
   *
   * This is necessary for modes with parental dependenceis (see notes on
   * `dependencyOnParent`) and for nodes that have `variants` - which must then be
   * exploded into their own individual modes at compile time.
   *
   * @param {Mode} mode
   * @returns {Mode | Mode[]}
   * */
  function expandOrCloneMode(mode) {
    if (mode.variants && !mode.cachedVariants) {
      mode.cachedVariants = mode.variants.map(function (variant) {
        return inherit$1(mode, {
          variants: null
        }, variant);
      });
    }

    // EXPAND
    // if we have variants then essentially "replace" the mode with the variants
    // this happens in compileMode, where this function is called from
    if (mode.cachedVariants) {
      return mode.cachedVariants;
    }

    // CLONE
    // if we have dependencies on parents then we need a unique
    // instance of ourselves, so we can be reused with many
    // different parents without issue
    if (dependencyOnParent(mode)) {
      return inherit$1(mode, {
        starts: mode.starts ? inherit$1(mode.starts) : null
      });
    }
    if (Object.isFrozen(mode)) {
      return inherit$1(mode);
    }

    // no special dependency issues, just return ourselves
    return mode;
  }
  var version = "11.8.0";
  class HTMLInjectionError extends Error {
    constructor(reason, html) {
      super(reason);
      this.name = "HTMLInjectionError";
      this.html = html;
    }
  }

  /*
  Syntax highlighting with language autodetection.
  https://highlightjs.org/
  */

  /**
  @typedef {import('highlight.js').Mode} Mode
  @typedef {import('highlight.js').CompiledMode} CompiledMode
  @typedef {import('highlight.js').CompiledScope} CompiledScope
  @typedef {import('highlight.js').Language} Language
  @typedef {import('highlight.js').HLJSApi} HLJSApi
  @typedef {import('highlight.js').HLJSPlugin} HLJSPlugin
  @typedef {import('highlight.js').PluginEvent} PluginEvent
  @typedef {import('highlight.js').HLJSOptions} HLJSOptions
  @typedef {import('highlight.js').LanguageFn} LanguageFn
  @typedef {import('highlight.js').HighlightedHTMLElement} HighlightedHTMLElement
  @typedef {import('highlight.js').BeforeHighlightContext} BeforeHighlightContext
  @typedef {import('highlight.js/private').MatchType} MatchType
  @typedef {import('highlight.js/private').KeywordData} KeywordData
  @typedef {import('highlight.js/private').EnhancedMatch} EnhancedMatch
  @typedef {import('highlight.js/private').AnnotatedError} AnnotatedError
  @typedef {import('highlight.js').AutoHighlightResult} AutoHighlightResult
  @typedef {import('highlight.js').HighlightOptions} HighlightOptions
  @typedef {import('highlight.js').HighlightResult} HighlightResult
  */

  const escape = escapeHTML;
  const inherit = inherit$1;
  const NO_MATCH = Symbol("nomatch");
  const MAX_KEYWORD_HITS = 7;

  /**
   * @param {any} hljs - object that is extended (legacy)
   * @returns {HLJSApi}
   */
  const HLJS = function (hljs) {
    // Global internal variables used within the highlight.js library.
    /** @type {Record<string, Language>} */
    const languages = Object.create(null);
    /** @type {Record<string, string>} */
    const aliases = Object.create(null);
    /** @type {HLJSPlugin[]} */
    const plugins = [];

    // safe/production mode - swallows more errors, tries to keep running
    // even if a single syntax or parse hits a fatal error
    let SAFE_MODE = true;
    const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";
    /** @type {Language} */
    const PLAINTEXT_LANGUAGE = {
      disableAutodetect: true,
      name: 'Plain text',
      contains: []
    };

    // Global options used when within external APIs. This is modified when
    // calling the `hljs.configure` function.
    /** @type HLJSOptions */
    let options = {
      ignoreUnescapedHTML: false,
      throwUnescapedHTML: false,
      noHighlightRe: /^(no-?highlight)$/i,
      languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
      classPrefix: 'hljs-',
      cssSelector: 'pre code',
      languages: null,
      // beta configuration options, subject to change, welcome to discuss
      // https://github.com/highlightjs/highlight.js/issues/1086
      __emitter: TokenTreeEmitter
    };

    /* Utility functions */

    /**
     * Tests a language name to see if highlighting should be skipped
     * @param {string} languageName
     */
    function shouldNotHighlight(languageName) {
      return options.noHighlightRe.test(languageName);
    }

    /**
     * @param {HighlightedHTMLElement} block - the HTML element to determine language for
     */
    function blockLanguage(block) {
      let classes = block.className + ' ';
      classes += block.parentNode ? block.parentNode.className : '';

      // language-* takes precedence over non-prefixed class names.
      const match = options.languageDetectRe.exec(classes);
      if (match) {
        const language = getLanguage(match[1]);
        if (!language) {
          warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
          warn("Falling back to no-highlight mode for this block.", block);
        }
        return language ? match[1] : 'no-highlight';
      }
      return classes.split(/\s+/).find(_class => shouldNotHighlight(_class) || getLanguage(_class));
    }

    /**
     * Core highlighting function.
     *
     * OLD API
     * highlight(lang, code, ignoreIllegals, continuation)
     *
     * NEW API
     * highlight(code, {lang, ignoreIllegals})
     *
     * @param {string} codeOrLanguageName - the language to use for highlighting
     * @param {string | HighlightOptions} optionsOrCode - the code to highlight
     * @param {boolean} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
     *
     * @returns {HighlightResult} Result - an object that represents the result
     * @property {string} language - the language name
     * @property {number} relevance - the relevance score
     * @property {string} value - the highlighted HTML code
     * @property {string} code - the original raw code
     * @property {CompiledMode} top - top of the current mode stack
     * @property {boolean} illegal - indicates whether any illegal matches were found
    */
    function highlight(codeOrLanguageName, optionsOrCode, ignoreIllegals) {
      let code = "";
      let languageName = "";
      if (typeof optionsOrCode === "object") {
        code = codeOrLanguageName;
        ignoreIllegals = optionsOrCode.ignoreIllegals;
        languageName = optionsOrCode.language;
      } else {
        // old API
        deprecated("10.7.0", "highlight(lang, code, ...args) has been deprecated.");
        deprecated("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277");
        languageName = codeOrLanguageName;
        code = optionsOrCode;
      }

      // https://github.com/highlightjs/highlight.js/issues/3149
      // eslint-disable-next-line no-undefined
      if (ignoreIllegals === undefined) {
        ignoreIllegals = true;
      }

      /** @type {BeforeHighlightContext} */
      const context = {
        code,
        language: languageName
      };
      // the plugin can change the desired language or the code to be highlighted
      // just be changing the object it was passed
      fire("before:highlight", context);

      // a before plugin can usurp the result completely by providing it's own
      // in which case we don't even need to call highlight
      const result = context.result ? context.result : _highlight(context.language, context.code, ignoreIllegals);
      result.code = context.code;
      // the plugin can change anything in result to suite it
      fire("after:highlight", result);
      return result;
    }

    /**
     * private highlight that's used internally and does not fire callbacks
     *
     * @param {string} languageName - the language to use for highlighting
     * @param {string} codeToHighlight - the code to highlight
     * @param {boolean?} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
     * @param {CompiledMode?} [continuation] - current continuation mode, if any
     * @returns {HighlightResult} - result of the highlight operation
    */
    function _highlight(languageName, codeToHighlight, ignoreIllegals, continuation) {
      const keywordHits = Object.create(null);

      /**
       * Return keyword data if a match is a keyword
       * @param {CompiledMode} mode - current mode
       * @param {string} matchText - the textual match
       * @returns {KeywordData | false}
       */
      function keywordData(mode, matchText) {
        return mode.keywords[matchText];
      }
      function processKeywords() {
        if (!top.keywords) {
          emitter.addText(modeBuffer);
          return;
        }
        let lastIndex = 0;
        top.keywordPatternRe.lastIndex = 0;
        let match = top.keywordPatternRe.exec(modeBuffer);
        let buf = "";
        while (match) {
          buf += modeBuffer.substring(lastIndex, match.index);
          const word = language.case_insensitive ? match[0].toLowerCase() : match[0];
          const data = keywordData(top, word);
          if (data) {
            const [kind, keywordRelevance] = data;
            emitter.addText(buf);
            buf = "";
            keywordHits[word] = (keywordHits[word] || 0) + 1;
            if (keywordHits[word] <= MAX_KEYWORD_HITS) relevance += keywordRelevance;
            if (kind.startsWith("_")) {
              // _ implied for relevance only, do not highlight
              // by applying a class name
              buf += match[0];
            } else {
              const cssClass = language.classNameAliases[kind] || kind;
              emitKeyword(match[0], cssClass);
            }
          } else {
            buf += match[0];
          }
          lastIndex = top.keywordPatternRe.lastIndex;
          match = top.keywordPatternRe.exec(modeBuffer);
        }
        buf += modeBuffer.substring(lastIndex);
        emitter.addText(buf);
      }
      function processSubLanguage() {
        if (modeBuffer === "") return;
        /** @type HighlightResult */
        let result = null;
        if (typeof top.subLanguage === 'string') {
          if (!languages[top.subLanguage]) {
            emitter.addText(modeBuffer);
            return;
          }
          result = _highlight(top.subLanguage, modeBuffer, true, continuations[top.subLanguage]);
          continuations[top.subLanguage] = /** @type {CompiledMode} */result._top;
        } else {
          result = highlightAuto(modeBuffer, top.subLanguage.length ? top.subLanguage : null);
        }

        // Counting embedded language score towards the host language may be disabled
        // with zeroing the containing mode relevance. Use case in point is Markdown that
        // allows XML everywhere and makes every XML snippet to have a much larger Markdown
        // score.
        if (top.relevance > 0) {
          relevance += result.relevance;
        }
        emitter.__addSublanguage(result._emitter, result.language);
      }
      function processBuffer() {
        if (top.subLanguage != null) {
          processSubLanguage();
        } else {
          processKeywords();
        }
        modeBuffer = '';
      }

      /**
       * @param {string} text
       * @param {string} scope
       */
      function emitKeyword(keyword, scope) {
        if (keyword === "") return;
        emitter.startScope(scope);
        emitter.addText(keyword);
        emitter.endScope();
      }

      /**
       * @param {CompiledScope} scope
       * @param {RegExpMatchArray} match
       */
      function emitMultiClass(scope, match) {
        let i = 1;
        const max = match.length - 1;
        while (i <= max) {
          if (!scope._emit[i]) {
            i++;
            continue;
          }
          const klass = language.classNameAliases[scope[i]] || scope[i];
          const text = match[i];
          if (klass) {
            emitKeyword(text, klass);
          } else {
            modeBuffer = text;
            processKeywords();
            modeBuffer = "";
          }
          i++;
        }
      }

      /**
       * @param {CompiledMode} mode - new mode to start
       * @param {RegExpMatchArray} match
       */
      function startNewMode(mode, match) {
        if (mode.scope && typeof mode.scope === "string") {
          emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
        }
        if (mode.beginScope) {
          // beginScope just wraps the begin match itself in a scope
          if (mode.beginScope._wrap) {
            emitKeyword(modeBuffer, language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap);
            modeBuffer = "";
          } else if (mode.beginScope._multi) {
            // at this point modeBuffer should just be the match
            emitMultiClass(mode.beginScope, match);
            modeBuffer = "";
          }
        }
        top = Object.create(mode, {
          parent: {
            value: top
          }
        });
        return top;
      }

      /**
       * @param {CompiledMode } mode - the mode to potentially end
       * @param {RegExpMatchArray} match - the latest match
       * @param {string} matchPlusRemainder - match plus remainder of content
       * @returns {CompiledMode | void} - the next mode, or if void continue on in current mode
       */
      function endOfMode(mode, match, matchPlusRemainder) {
        let matched = startsWith(mode.endRe, matchPlusRemainder);
        if (matched) {
          if (mode["on:end"]) {
            const resp = new Response(mode);
            mode["on:end"](match, resp);
            if (resp.isMatchIgnored) matched = false;
          }
          if (matched) {
            while (mode.endsParent && mode.parent) {
              mode = mode.parent;
            }
            return mode;
          }
        }
        // even if on:end fires an `ignore` it's still possible
        // that we might trigger the end node because of a parent mode
        if (mode.endsWithParent) {
          return endOfMode(mode.parent, match, matchPlusRemainder);
        }
      }

      /**
       * Handle matching but then ignoring a sequence of text
       *
       * @param {string} lexeme - string containing full match text
       */
      function doIgnore(lexeme) {
        if (top.matcher.regexIndex === 0) {
          // no more regexes to potentially match here, so we move the cursor forward one
          // space
          modeBuffer += lexeme[0];
          return 1;
        } else {
          // no need to move the cursor, we still have additional regexes to try and
          // match at this very spot
          resumeScanAtSamePosition = true;
          return 0;
        }
      }

      /**
       * Handle the start of a new potential mode match
       *
       * @param {EnhancedMatch} match - the current match
       * @returns {number} how far to advance the parse cursor
       */
      function doBeginMatch(match) {
        const lexeme = match[0];
        const newMode = match.rule;
        const resp = new Response(newMode);
        // first internal before callbacks, then the public ones
        const beforeCallbacks = [newMode.__beforeBegin, newMode["on:begin"]];
        for (const cb of beforeCallbacks) {
          if (!cb) continue;
          cb(match, resp);
          if (resp.isMatchIgnored) return doIgnore(lexeme);
        }
        if (newMode.skip) {
          modeBuffer += lexeme;
        } else {
          if (newMode.excludeBegin) {
            modeBuffer += lexeme;
          }
          processBuffer();
          if (!newMode.returnBegin && !newMode.excludeBegin) {
            modeBuffer = lexeme;
          }
        }
        startNewMode(newMode, match);
        return newMode.returnBegin ? 0 : lexeme.length;
      }

      /**
       * Handle the potential end of mode
       *
       * @param {RegExpMatchArray} match - the current match
       */
      function doEndMatch(match) {
        const lexeme = match[0];
        const matchPlusRemainder = codeToHighlight.substring(match.index);
        const endMode = endOfMode(top, match, matchPlusRemainder);
        if (!endMode) {
          return NO_MATCH;
        }
        const origin = top;
        if (top.endScope && top.endScope._wrap) {
          processBuffer();
          emitKeyword(lexeme, top.endScope._wrap);
        } else if (top.endScope && top.endScope._multi) {
          processBuffer();
          emitMultiClass(top.endScope, match);
        } else if (origin.skip) {
          modeBuffer += lexeme;
        } else {
          if (!(origin.returnEnd || origin.excludeEnd)) {
            modeBuffer += lexeme;
          }
          processBuffer();
          if (origin.excludeEnd) {
            modeBuffer = lexeme;
          }
        }
        do {
          if (top.scope) {
            emitter.closeNode();
          }
          if (!top.skip && !top.subLanguage) {
            relevance += top.relevance;
          }
          top = top.parent;
        } while (top !== endMode.parent);
        if (endMode.starts) {
          startNewMode(endMode.starts, match);
        }
        return origin.returnEnd ? 0 : lexeme.length;
      }
      function processContinuations() {
        const list = [];
        for (let current = top; current !== language; current = current.parent) {
          if (current.scope) {
            list.unshift(current.scope);
          }
        }
        list.forEach(item => emitter.openNode(item));
      }

      /** @type {{type?: MatchType, index?: number, rule?: Mode}}} */
      let lastMatch = {};

      /**
       *  Process an individual match
       *
       * @param {string} textBeforeMatch - text preceding the match (since the last match)
       * @param {EnhancedMatch} [match] - the match itself
       */
      function processLexeme(textBeforeMatch, match) {
        const lexeme = match && match[0];

        // add non-matched text to the current mode buffer
        modeBuffer += textBeforeMatch;
        if (lexeme == null) {
          processBuffer();
          return 0;
        }

        // we've found a 0 width match and we're stuck, so we need to advance
        // this happens when we have badly behaved rules that have optional matchers to the degree that
        // sometimes they can end up matching nothing at all
        // Ref: https://github.com/highlightjs/highlight.js/issues/2140
        if (lastMatch.type === "begin" && match.type === "end" && lastMatch.index === match.index && lexeme === "") {
          // spit the "skipped" character that our regex choked on back into the output sequence
          modeBuffer += codeToHighlight.slice(match.index, match.index + 1);
          if (!SAFE_MODE) {
            /** @type {AnnotatedError} */
            const err = new Error(`0 width match regex (${languageName})`);
            err.languageName = languageName;
            err.badRule = lastMatch.rule;
            throw err;
          }
          return 1;
        }
        lastMatch = match;
        if (match.type === "begin") {
          return doBeginMatch(match);
        } else if (match.type === "illegal" && !ignoreIllegals) {
          // illegal match, we do not continue processing
          /** @type {AnnotatedError} */
          const err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.scope || '<unnamed>') + '"');
          err.mode = top;
          throw err;
        } else if (match.type === "end") {
          const processed = doEndMatch(match);
          if (processed !== NO_MATCH) {
            return processed;
          }
        }

        // edge case for when illegal matches $ (end of line) which is technically
        // a 0 width match but not a begin/end match so it's not caught by the
        // first handler (when ignoreIllegals is true)
        if (match.type === "illegal" && lexeme === "") {
          // advance so we aren't stuck in an infinite loop
          return 1;
        }

        // infinite loops are BAD, this is a last ditch catch all. if we have a
        // decent number of iterations yet our index (cursor position in our
        // parsing) still 3x behind our index then something is very wrong
        // so we bail
        if (iterations > 100000 && iterations > match.index * 3) {
          const err = new Error('potential infinite loop, way more iterations than matches');
          throw err;
        }

        /*
        Why might be find ourselves here?  An potential end match that was
        triggered but could not be completed.  IE, `doEndMatch` returned NO_MATCH.
        (this could be because a callback requests the match be ignored, etc)
         This causes no real harm other than stopping a few times too many.
        */

        modeBuffer += lexeme;
        return lexeme.length;
      }
      const language = getLanguage(languageName);
      if (!language) {
        error$1(LANGUAGE_NOT_FOUND.replace("{}", languageName));
        throw new Error('Unknown language: "' + languageName + '"');
      }
      const md = compileLanguage(language);
      let result = '';
      /** @type {CompiledMode} */
      let top = continuation || md;
      /** @type Record<string,CompiledMode> */
      const continuations = {}; // keep continuations for sub-languages
      const emitter = new options.__emitter(options);
      processContinuations();
      let modeBuffer = '';
      let relevance = 0;
      let index = 0;
      let iterations = 0;
      let resumeScanAtSamePosition = false;
      try {
        if (!language.__emitTokens) {
          top.matcher.considerAll();
          for (;;) {
            iterations++;
            if (resumeScanAtSamePosition) {
              // only regexes not matched previously will now be
              // considered for a potential match
              resumeScanAtSamePosition = false;
            } else {
              top.matcher.considerAll();
            }
            top.matcher.lastIndex = index;
            const match = top.matcher.exec(codeToHighlight);
            // console.log("match", match[0], match.rule && match.rule.begin)

            if (!match) break;
            const beforeMatch = codeToHighlight.substring(index, match.index);
            const processedCount = processLexeme(beforeMatch, match);
            index = match.index + processedCount;
          }
          processLexeme(codeToHighlight.substring(index));
        } else {
          language.__emitTokens(codeToHighlight, emitter);
        }
        emitter.finalize();
        result = emitter.toHTML();
        return {
          language: languageName,
          value: result,
          relevance,
          illegal: false,
          _emitter: emitter,
          _top: top
        };
      } catch (err) {
        if (err.message && err.message.includes('Illegal')) {
          return {
            language: languageName,
            value: escape(codeToHighlight),
            illegal: true,
            relevance: 0,
            _illegalBy: {
              message: err.message,
              index,
              context: codeToHighlight.slice(index - 100, index + 100),
              mode: err.mode,
              resultSoFar: result
            },
            _emitter: emitter
          };
        } else if (SAFE_MODE) {
          return {
            language: languageName,
            value: escape(codeToHighlight),
            illegal: false,
            relevance: 0,
            errorRaised: err,
            _emitter: emitter,
            _top: top
          };
        } else {
          throw err;
        }
      }
    }

    /**
     * returns a valid highlight result, without actually doing any actual work,
     * auto highlight starts with this and it's possible for small snippets that
     * auto-detection may not find a better match
     * @param {string} code
     * @returns {HighlightResult}
     */
    function justTextHighlightResult(code) {
      const result = {
        value: escape(code),
        illegal: false,
        relevance: 0,
        _top: PLAINTEXT_LANGUAGE,
        _emitter: new options.__emitter(options)
      };
      result._emitter.addText(code);
      return result;
    }

    /**
    Highlighting with language detection. Accepts a string with the code to
    highlight. Returns an object with the following properties:
     - language (detected language)
    - relevance (int)
    - value (an HTML string with highlighting markup)
    - secondBest (object with the same structure for second-best heuristically
      detected language, may be absent)
       @param {string} code
      @param {Array<string>} [languageSubset]
      @returns {AutoHighlightResult}
    */
    function highlightAuto(code, languageSubset) {
      languageSubset = languageSubset || options.languages || Object.keys(languages);
      const plaintext = justTextHighlightResult(code);
      const results = languageSubset.filter(getLanguage).filter(autoDetection).map(name => _highlight(name, code, false));
      results.unshift(plaintext); // plaintext is always an option

      const sorted = results.sort((a, b) => {
        // sort base on relevance
        if (a.relevance !== b.relevance) return b.relevance - a.relevance;

        // always award the tie to the base language
        // ie if C++ and Arduino are tied, it's more likely to be C++
        if (a.language && b.language) {
          if (getLanguage(a.language).supersetOf === b.language) {
            return 1;
          } else if (getLanguage(b.language).supersetOf === a.language) {
            return -1;
          }
        }

        // otherwise say they are equal, which has the effect of sorting on
        // relevance while preserving the original ordering - which is how ties
        // have historically been settled, ie the language that comes first always
        // wins in the case of a tie
        return 0;
      });
      const [best, secondBest] = sorted;

      /** @type {AutoHighlightResult} */
      const result = best;
      result.secondBest = secondBest;
      return result;
    }

    /**
     * Builds new class name for block given the language name
     *
     * @param {HTMLElement} element
     * @param {string} [currentLang]
     * @param {string} [resultLang]
     */
    function updateClassName(element, currentLang, resultLang) {
      const language = currentLang && aliases[currentLang] || resultLang;
      element.classList.add("hljs");
      element.classList.add(`language-${language}`);
    }

    /**
     * Applies highlighting to a DOM node containing code.
     *
     * @param {HighlightedHTMLElement} element - the HTML element to highlight
    */
    function highlightElement(element) {
      /** @type HTMLElement */
      let node = null;
      const language = blockLanguage(element);
      if (shouldNotHighlight(language)) return;
      fire("before:highlightElement", {
        el: element,
        language
      });

      // we should be all text, no child nodes (unescaped HTML) - this is possibly
      // an HTML injection attack - it's likely too late if this is already in
      // production (the code has likely already done its damage by the time
      // we're seeing it)... but we yell loudly about this so that hopefully it's
      // more likely to be caught in development before making it to production
      if (element.children.length > 0) {
        if (!options.ignoreUnescapedHTML) {
          console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk.");
          console.warn("https://github.com/highlightjs/highlight.js/wiki/security");
          console.warn("The element with unescaped HTML:");
          console.warn(element);
        }
        if (options.throwUnescapedHTML) {
          const err = new HTMLInjectionError("One of your code blocks includes unescaped HTML.", element.innerHTML);
          throw err;
        }
      }
      node = element;
      const text = node.textContent;
      const result = language ? highlight(text, {
        language,
        ignoreIllegals: true
      }) : highlightAuto(text);
      element.innerHTML = result.value;
      updateClassName(element, language, result.language);
      element.result = {
        language: result.language,
        // TODO: remove with version 11.0
        re: result.relevance,
        relevance: result.relevance
      };
      if (result.secondBest) {
        element.secondBest = {
          language: result.secondBest.language,
          relevance: result.secondBest.relevance
        };
      }
      fire("after:highlightElement", {
        el: element,
        result,
        text
      });
    }

    /**
     * Updates highlight.js global options with the passed options
     *
     * @param {Partial<HLJSOptions>} userOptions
     */
    function configure(userOptions) {
      options = inherit(options, userOptions);
    }

    // TODO: remove v12, deprecated
    const initHighlighting = () => {
      highlightAll();
      deprecated("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
    };

    // TODO: remove v12, deprecated
    function initHighlightingOnLoad() {
      highlightAll();
      deprecated("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
    }
    let wantsHighlight = false;

    /**
     * auto-highlights all pre>code elements on the page
     */
    function highlightAll() {
      // if we are called too early in the loading process
      if (document.readyState === "loading") {
        wantsHighlight = true;
        return;
      }
      const blocks = document.querySelectorAll(options.cssSelector);
      blocks.forEach(highlightElement);
    }
    function boot() {
      // if a highlight was requested before DOM was loaded, do now
      if (wantsHighlight) highlightAll();
    }

    // make sure we are in the browser environment
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('DOMContentLoaded', boot, false);
    }

    /**
     * Register a language grammar module
     *
     * @param {string} languageName
     * @param {LanguageFn} languageDefinition
     */
    function registerLanguage(languageName, languageDefinition) {
      let lang = null;
      try {
        lang = languageDefinition(hljs);
      } catch (error$1$1) {
        error$1("Language definition for '{}' could not be registered.".replace("{}", languageName));
        // hard or soft error
        if (!SAFE_MODE) {
          throw error$1$1;
        } else {
          error$1(error$1$1);
        }
        // languages that have serious errors are replaced with essentially a
        // "plaintext" stand-in so that the code blocks will still get normal
        // css classes applied to them - and one bad language won't break the
        // entire highlighter
        lang = PLAINTEXT_LANGUAGE;
      }
      // give it a temporary name if it doesn't have one in the meta-data
      if (!lang.name) lang.name = languageName;
      languages[languageName] = lang;
      lang.rawDefinition = languageDefinition.bind(null, hljs);
      if (lang.aliases) {
        registerAliases(lang.aliases, {
          languageName
        });
      }
    }

    /**
     * Remove a language grammar module
     *
     * @param {string} languageName
     */
    function unregisterLanguage(languageName) {
      delete languages[languageName];
      for (const alias of Object.keys(aliases)) {
        if (aliases[alias] === languageName) {
          delete aliases[alias];
        }
      }
    }

    /**
     * @returns {string[]} List of language internal names
     */
    function listLanguages() {
      return Object.keys(languages);
    }

    /**
     * @param {string} name - name of the language to retrieve
     * @returns {Language | undefined}
     */
    function getLanguage(name) {
      name = (name || '').toLowerCase();
      return languages[name] || languages[aliases[name]];
    }

    /**
     *
     * @param {string|string[]} aliasList - single alias or list of aliases
     * @param {{languageName: string}} opts
     */
    function registerAliases(aliasList, {
      languageName
    }) {
      if (typeof aliasList === 'string') {
        aliasList = [aliasList];
      }
      aliasList.forEach(alias => {
        aliases[alias.toLowerCase()] = languageName;
      });
    }

    /**
     * Determines if a given language has auto-detection enabled
     * @param {string} name - name of the language
     */
    function autoDetection(name) {
      const lang = getLanguage(name);
      return lang && !lang.disableAutodetect;
    }

    /**
     * Upgrades the old highlightBlock plugins to the new
     * highlightElement API
     * @param {HLJSPlugin} plugin
     */
    function upgradePluginAPI(plugin) {
      // TODO: remove with v12
      if (plugin["before:highlightBlock"] && !plugin["before:highlightElement"]) {
        plugin["before:highlightElement"] = data => {
          plugin["before:highlightBlock"](Object.assign({
            block: data.el
          }, data));
        };
      }
      if (plugin["after:highlightBlock"] && !plugin["after:highlightElement"]) {
        plugin["after:highlightElement"] = data => {
          plugin["after:highlightBlock"](Object.assign({
            block: data.el
          }, data));
        };
      }
    }

    /**
     * @param {HLJSPlugin} plugin
     */
    function addPlugin(plugin) {
      upgradePluginAPI(plugin);
      plugins.push(plugin);
    }

    /**
     * @param {HLJSPlugin} plugin
     */
    function removePlugin(plugin) {
      const index = plugins.indexOf(plugin);
      if (index !== -1) {
        plugins.splice(index, 1);
      }
    }

    /**
     *
     * @param {PluginEvent} event
     * @param {any} args
     */
    function fire(event, args) {
      const cb = event;
      plugins.forEach(function (plugin) {
        if (plugin[cb]) {
          plugin[cb](args);
        }
      });
    }

    /**
     * DEPRECATED
     * @param {HighlightedHTMLElement} el
     */
    function deprecateHighlightBlock(el) {
      deprecated("10.7.0", "highlightBlock will be removed entirely in v12.0");
      deprecated("10.7.0", "Please use highlightElement now.");
      return highlightElement(el);
    }

    /* Interface definition */
    Object.assign(hljs, {
      highlight,
      highlightAuto,
      highlightAll,
      highlightElement,
      // TODO: Remove with v12 API
      highlightBlock: deprecateHighlightBlock,
      configure,
      initHighlighting,
      initHighlightingOnLoad,
      registerLanguage,
      unregisterLanguage,
      listLanguages,
      getLanguage,
      registerAliases,
      autoDetection,
      inherit,
      addPlugin,
      removePlugin
    });
    hljs.debugMode = function () {
      SAFE_MODE = false;
    };
    hljs.safeMode = function () {
      SAFE_MODE = true;
    };
    hljs.versionString = version;
    hljs.regex = {
      concat: concat,
      lookahead: lookahead,
      either: either,
      optional: optional,
      anyNumberOfTimes: anyNumberOfTimes
    };
    for (const key in MODES) {
      // @ts-ignore
      if (typeof MODES[key] === "object") {
        // @ts-ignore
        deepFreeze(MODES[key]);
      }
    }

    // merge all the modes/regexes into our main object
    Object.assign(hljs, MODES);
    return hljs;
  };

  // Other names for the variable may break build script
  const highlight = HLJS({});

  // returns a new instance of the highlighter to be used for extensions
  // check https://github.com/wooorm/lowlight/issues/47
  highlight.newInstance = () => HLJS({});
  var core = highlight;
  highlight.HighlightJS = highlight;
  highlight.default = highlight;

  /*
  Language: HTML, XML
  Website: https://www.w3.org/XML/
  Category: common, web
  Audit: 2020
  */
  var xml_1;
  var hasRequiredXml;
  function requireXml() {
    if (hasRequiredXml) return xml_1;
    hasRequiredXml = 1;
    /** @type LanguageFn */
    function xml(hljs) {
      const regex = hljs.regex;
      // XML names can have the following additional letters: https://www.w3.org/TR/xml/#NT-NameChar
      // OTHER_NAME_CHARS = /[:\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]/;
      // Element names start with NAME_START_CHAR followed by optional other Unicode letters, ASCII digits, hyphens, underscores, and periods
      // const TAG_NAME_RE = regex.concat(/[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, regex.optional(/[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*:/), /[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*/);;
      // const XML_IDENT_RE = /[A-Z_a-z:\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]+/;
      // const TAG_NAME_RE = regex.concat(/[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, regex.optional(/[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*:/), /[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*/);
      // however, to cater for performance and more Unicode support rely simply on the Unicode letter class
      const TAG_NAME_RE = regex.concat(/[\p{L}_]/u, regex.optional(/[\p{L}0-9_.-]*:/u), /[\p{L}0-9_.-]*/u);
      const XML_IDENT_RE = /[\p{L}0-9._:-]+/u;
      const XML_ENTITIES = {
        className: 'symbol',
        begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/
      };
      const XML_META_KEYWORDS = {
        begin: /\s/,
        contains: [{
          className: 'keyword',
          begin: /#?[a-z_][a-z1-9_-]+/,
          illegal: /\n/
        }]
      };
      const XML_META_PAR_KEYWORDS = hljs.inherit(XML_META_KEYWORDS, {
        begin: /\(/,
        end: /\)/
      });
      const APOS_META_STRING_MODE = hljs.inherit(hljs.APOS_STRING_MODE, {
        className: 'string'
      });
      const QUOTE_META_STRING_MODE = hljs.inherit(hljs.QUOTE_STRING_MODE, {
        className: 'string'
      });
      const TAG_INTERNALS = {
        endsWithParent: true,
        illegal: /</,
        relevance: 0,
        contains: [{
          className: 'attr',
          begin: XML_IDENT_RE,
          relevance: 0
        }, {
          begin: /=\s*/,
          relevance: 0,
          contains: [{
            className: 'string',
            endsParent: true,
            variants: [{
              begin: /"/,
              end: /"/,
              contains: [XML_ENTITIES]
            }, {
              begin: /'/,
              end: /'/,
              contains: [XML_ENTITIES]
            }, {
              begin: /[^\s"'=<>`]+/
            }]
          }]
        }]
      };
      return {
        name: 'HTML, XML',
        aliases: ['html', 'xhtml', 'rss', 'atom', 'xjb', 'xsd', 'xsl', 'plist', 'wsf', 'svg'],
        case_insensitive: true,
        unicodeRegex: true,
        contains: [{
          className: 'meta',
          begin: /<![a-z]/,
          end: />/,
          relevance: 10,
          contains: [XML_META_KEYWORDS, QUOTE_META_STRING_MODE, APOS_META_STRING_MODE, XML_META_PAR_KEYWORDS, {
            begin: /\[/,
            end: /\]/,
            contains: [{
              className: 'meta',
              begin: /<![a-z]/,
              end: />/,
              contains: [XML_META_KEYWORDS, XML_META_PAR_KEYWORDS, QUOTE_META_STRING_MODE, APOS_META_STRING_MODE]
            }]
          }]
        }, hljs.COMMENT(/<!--/, /-->/, {
          relevance: 10
        }), {
          begin: /<!\[CDATA\[/,
          end: /\]\]>/,
          relevance: 10
        }, XML_ENTITIES,
        // xml processing instructions
        {
          className: 'meta',
          end: /\?>/,
          variants: [{
            begin: /<\?xml/,
            relevance: 10,
            contains: [QUOTE_META_STRING_MODE]
          }, {
            begin: /<\?[a-z][a-z0-9]+/
          }]
        }, {
          className: 'tag',
          /*
          The lookahead pattern (?=...) ensures that 'begin' only matches
          '<style' as a single word, followed by a whitespace or an
          ending bracket.
          */
          begin: /<style(?=\s|>)/,
          end: />/,
          keywords: {
            name: 'style'
          },
          contains: [TAG_INTERNALS],
          starts: {
            end: /<\/style>/,
            returnEnd: true,
            subLanguage: ['css', 'xml']
          }
        }, {
          className: 'tag',
          // See the comment in the <style tag about the lookahead pattern
          begin: /<script(?=\s|>)/,
          end: />/,
          keywords: {
            name: 'script'
          },
          contains: [TAG_INTERNALS],
          starts: {
            end: /<\/script>/,
            returnEnd: true,
            subLanguage: ['javascript', 'handlebars', 'xml']
          }
        },
        // we need this for now for jSX
        {
          className: 'tag',
          begin: /<>|<\/>/
        },
        // open tag
        {
          className: 'tag',
          begin: regex.concat(/</, regex.lookahead(regex.concat(TAG_NAME_RE,
          // <tag/>
          // <tag>
          // <tag ...
          regex.either(/\/>/, />/, /\s/)))),
          end: /\/?>/,
          contains: [{
            className: 'name',
            begin: TAG_NAME_RE,
            relevance: 0,
            starts: TAG_INTERNALS
          }]
        },
        // close tag
        {
          className: 'tag',
          begin: regex.concat(/<\//, regex.lookahead(regex.concat(TAG_NAME_RE, />/))),
          contains: [{
            className: 'name',
            begin: TAG_NAME_RE,
            relevance: 0
          }, {
            begin: />/,
            relevance: 0,
            endsParent: true
          }]
        }]
      };
    }
    xml_1 = xml;
    return xml_1;
  }

  /*
  Language: Bash
  Author: vah <vahtenberg@gmail.com>
  Contributrors: Benjamin Pannell <contact@sierrasoftworks.com>
  Website: https://www.gnu.org/software/bash/
  Category: common
  */
  var bash_1;
  var hasRequiredBash;
  function requireBash() {
    if (hasRequiredBash) return bash_1;
    hasRequiredBash = 1;
    /** @type LanguageFn */
    function bash(hljs) {
      const regex = hljs.regex;
      const VAR = {};
      const BRACED_VAR = {
        begin: /\$\{/,
        end: /\}/,
        contains: ["self", {
          begin: /:-/,
          contains: [VAR]
        } // default values
        ]
      };

      Object.assign(VAR, {
        className: 'variable',
        variants: [{
          begin: regex.concat(/\$[\w\d#@][\w\d_]*/,
          // negative look-ahead tries to avoid matching patterns that are not
          // Perl at all like $ident$, @ident@, etc.
          `(?![\\w\\d])(?![$])`)
        }, BRACED_VAR]
      });
      const SUBST = {
        className: 'subst',
        begin: /\$\(/,
        end: /\)/,
        contains: [hljs.BACKSLASH_ESCAPE]
      };
      const HERE_DOC = {
        begin: /<<-?\s*(?=\w+)/,
        starts: {
          contains: [hljs.END_SAME_AS_BEGIN({
            begin: /(\w+)/,
            end: /(\w+)/,
            className: 'string'
          })]
        }
      };
      const QUOTE_STRING = {
        className: 'string',
        begin: /"/,
        end: /"/,
        contains: [hljs.BACKSLASH_ESCAPE, VAR, SUBST]
      };
      SUBST.contains.push(QUOTE_STRING);
      const ESCAPED_QUOTE = {
        className: '',
        begin: /\\"/
      };
      const APOS_STRING = {
        className: 'string',
        begin: /'/,
        end: /'/
      };
      const ARITHMETIC = {
        begin: /\$?\(\(/,
        end: /\)\)/,
        contains: [{
          begin: /\d+#[0-9a-f]+/,
          className: "number"
        }, hljs.NUMBER_MODE, VAR]
      };
      const SH_LIKE_SHELLS = ["fish", "bash", "zsh", "sh", "csh", "ksh", "tcsh", "dash", "scsh"];
      const KNOWN_SHEBANG = hljs.SHEBANG({
        binary: `(${SH_LIKE_SHELLS.join("|")})`,
        relevance: 10
      });
      const FUNCTION = {
        className: 'function',
        begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
        returnBegin: true,
        contains: [hljs.inherit(hljs.TITLE_MODE, {
          begin: /\w[\w\d_]*/
        })],
        relevance: 0
      };
      const KEYWORDS = ["if", "then", "else", "elif", "fi", "for", "while", "until", "in", "do", "done", "case", "esac", "function", "select"];
      const LITERALS = ["true", "false"];

      // to consume paths to prevent keyword matches inside them
      const PATH_MODE = {
        match: /(\/[a-z._-]+)+/
      };

      // http://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
      const SHELL_BUILT_INS = ["break", "cd", "continue", "eval", "exec", "exit", "export", "getopts", "hash", "pwd", "readonly", "return", "shift", "test", "times", "trap", "umask", "unset"];
      const BASH_BUILT_INS = ["alias", "bind", "builtin", "caller", "command", "declare", "echo", "enable", "help", "let", "local", "logout", "mapfile", "printf", "read", "readarray", "source", "type", "typeset", "ulimit", "unalias"];
      const ZSH_BUILT_INS = ["autoload", "bg", "bindkey", "bye", "cap", "chdir", "clone", "comparguments", "compcall", "compctl", "compdescribe", "compfiles", "compgroups", "compquote", "comptags", "comptry", "compvalues", "dirs", "disable", "disown", "echotc", "echoti", "emulate", "fc", "fg", "float", "functions", "getcap", "getln", "history", "integer", "jobs", "kill", "limit", "log", "noglob", "popd", "print", "pushd", "pushln", "rehash", "sched", "setcap", "setopt", "stat", "suspend", "ttyctl", "unfunction", "unhash", "unlimit", "unsetopt", "vared", "wait", "whence", "where", "which", "zcompile", "zformat", "zftp", "zle", "zmodload", "zparseopts", "zprof", "zpty", "zregexparse", "zsocket", "zstyle", "ztcp"];
      const GNU_CORE_UTILS = ["chcon", "chgrp", "chown", "chmod", "cp", "dd", "df", "dir", "dircolors", "ln", "ls", "mkdir", "mkfifo", "mknod", "mktemp", "mv", "realpath", "rm", "rmdir", "shred", "sync", "touch", "truncate", "vdir", "b2sum", "base32", "base64", "cat", "cksum", "comm", "csplit", "cut", "expand", "fmt", "fold", "head", "join", "md5sum", "nl", "numfmt", "od", "paste", "ptx", "pr", "sha1sum", "sha224sum", "sha256sum", "sha384sum", "sha512sum", "shuf", "sort", "split", "sum", "tac", "tail", "tr", "tsort", "unexpand", "uniq", "wc", "arch", "basename", "chroot", "date", "dirname", "du", "echo", "env", "expr", "factor",
      // "false", // keyword literal already
      "groups", "hostid", "id", "link", "logname", "nice", "nohup", "nproc", "pathchk", "pinky", "printenv", "printf", "pwd", "readlink", "runcon", "seq", "sleep", "stat", "stdbuf", "stty", "tee", "test", "timeout",
      // "true", // keyword literal already
      "tty", "uname", "unlink", "uptime", "users", "who", "whoami", "yes"];
      return {
        name: 'Bash',
        aliases: ['sh'],
        keywords: {
          $pattern: /\b[a-z][a-z0-9._-]+\b/,
          keyword: KEYWORDS,
          literal: LITERALS,
          built_in: [...SHELL_BUILT_INS, ...BASH_BUILT_INS,
          // Shell modifiers
          "set", "shopt", ...ZSH_BUILT_INS, ...GNU_CORE_UTILS]
        },
        contains: [KNOWN_SHEBANG,
        // to catch known shells and boost relevancy
        hljs.SHEBANG(),
        // to catch unknown shells but still highlight the shebang
        FUNCTION, ARITHMETIC, hljs.HASH_COMMENT_MODE, HERE_DOC, PATH_MODE, QUOTE_STRING, ESCAPED_QUOTE, APOS_STRING, VAR]
      };
    }
    bash_1 = bash;
    return bash_1;
  }

  /*
  Language: C
  Category: common, system
  Website: https://en.wikipedia.org/wiki/C_(programming_language)
  */
  var c_1;
  var hasRequiredC;
  function requireC() {
    if (hasRequiredC) return c_1;
    hasRequiredC = 1;
    /** @type LanguageFn */
    function c(hljs) {
      const regex = hljs.regex;
      // added for historic reasons because `hljs.C_LINE_COMMENT_MODE` does
      // not include such support nor can we be sure all the grammars depending
      // on it would desire this behavior
      const C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$', {
        contains: [{
          begin: /\\\n/
        }]
      });
      const DECLTYPE_AUTO_RE = 'decltype\\(auto\\)';
      const NAMESPACE_RE = '[a-zA-Z_]\\w*::';
      const TEMPLATE_ARGUMENT_RE = '<[^<>]+>';
      const FUNCTION_TYPE_RE = '(' + DECLTYPE_AUTO_RE + '|' + regex.optional(NAMESPACE_RE) + '[a-zA-Z_]\\w*' + regex.optional(TEMPLATE_ARGUMENT_RE) + ')';
      const TYPES = {
        className: 'type',
        variants: [{
          begin: '\\b[a-z\\d_]*_t\\b'
        }, {
          match: /\batomic_[a-z]{3,6}\b/
        }]
      };

      // https://en.cppreference.com/w/cpp/language/escape
      // \\ \x \xFF \u2837 \u00323747 \374
      const CHARACTER_ESCAPES = '\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)';
      const STRINGS = {
        className: 'string',
        variants: [{
          begin: '(u8?|U|L)?"',
          end: '"',
          illegal: '\\n',
          contains: [hljs.BACKSLASH_ESCAPE]
        }, {
          begin: '(u8?|U|L)?\'(' + CHARACTER_ESCAPES + "|.)",
          end: '\'',
          illegal: '.'
        }, hljs.END_SAME_AS_BEGIN({
          begin: /(?:u8?|U|L)?R"([^()\\ ]{0,16})\(/,
          end: /\)([^()\\ ]{0,16})"/
        })]
      };
      const NUMBERS = {
        className: 'number',
        variants: [{
          begin: '\\b(0b[01\']+)'
        }, {
          begin: '(-?)\\b([\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)((ll|LL|l|L)(u|U)?|(u|U)(ll|LL|l|L)?|f|F|b|B)'
        }, {
          begin: '(-?)(\\b0[xX][a-fA-F0-9\']+|(\\b[\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)([eE][-+]?[\\d\']+)?)'
        }],
        relevance: 0
      };
      const PREPROCESSOR = {
        className: 'meta',
        begin: /#\s*[a-z]+\b/,
        end: /$/,
        keywords: {
          keyword: 'if else elif endif define undef warning error line ' + 'pragma _Pragma ifdef ifndef include'
        },
        contains: [{
          begin: /\\\n/,
          relevance: 0
        }, hljs.inherit(STRINGS, {
          className: 'string'
        }), {
          className: 'string',
          begin: /<.*?>/
        }, C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE]
      };
      const TITLE_MODE = {
        className: 'title',
        begin: regex.optional(NAMESPACE_RE) + hljs.IDENT_RE,
        relevance: 0
      };
      const FUNCTION_TITLE = regex.optional(NAMESPACE_RE) + hljs.IDENT_RE + '\\s*\\(';
      const C_KEYWORDS = ["asm", "auto", "break", "case", "continue", "default", "do", "else", "enum", "extern", "for", "fortran", "goto", "if", "inline", "register", "restrict", "return", "sizeof", "struct", "switch", "typedef", "union", "volatile", "while", "_Alignas", "_Alignof", "_Atomic", "_Generic", "_Noreturn", "_Static_assert", "_Thread_local",
      // aliases
      "alignas", "alignof", "noreturn", "static_assert", "thread_local",
      // not a C keyword but is, for all intents and purposes, treated exactly like one.
      "_Pragma"];
      const C_TYPES = ["float", "double", "signed", "unsigned", "int", "short", "long", "char", "void", "_Bool", "_Complex", "_Imaginary", "_Decimal32", "_Decimal64", "_Decimal128",
      // modifiers
      "const", "static",
      // aliases
      "complex", "bool", "imaginary"];
      const KEYWORDS = {
        keyword: C_KEYWORDS,
        type: C_TYPES,
        literal: 'true false NULL',
        // TODO: apply hinting work similar to what was done in cpp.js
        built_in: 'std string wstring cin cout cerr clog stdin stdout stderr stringstream istringstream ostringstream ' + 'auto_ptr deque list queue stack vector map set pair bitset multiset multimap unordered_set ' + 'unordered_map unordered_multiset unordered_multimap priority_queue make_pair array shared_ptr abort terminate abs acos ' + 'asin atan2 atan calloc ceil cosh cos exit exp fabs floor fmod fprintf fputs free frexp ' + 'fscanf future isalnum isalpha iscntrl isdigit isgraph islower isprint ispunct isspace isupper ' + 'isxdigit tolower toupper labs ldexp log10 log malloc realloc memchr memcmp memcpy memset modf pow ' + 'printf putchar puts scanf sinh sin snprintf sprintf sqrt sscanf strcat strchr strcmp ' + 'strcpy strcspn strlen strncat strncmp strncpy strpbrk strrchr strspn strstr tanh tan ' + 'vfprintf vprintf vsprintf endl initializer_list unique_ptr'
      };
      const EXPRESSION_CONTAINS = [PREPROCESSOR, TYPES, C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, NUMBERS, STRINGS];
      const EXPRESSION_CONTEXT = {
        // This mode covers expression context where we can't expect a function
        // definition and shouldn't highlight anything that looks like one:
        // `return some()`, `else if()`, `(x*sum(1, 2))`
        variants: [{
          begin: /=/,
          end: /;/
        }, {
          begin: /\(/,
          end: /\)/
        }, {
          beginKeywords: 'new throw return else',
          end: /;/
        }],
        keywords: KEYWORDS,
        contains: EXPRESSION_CONTAINS.concat([{
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          contains: EXPRESSION_CONTAINS.concat(['self']),
          relevance: 0
        }]),
        relevance: 0
      };
      const FUNCTION_DECLARATION = {
        begin: '(' + FUNCTION_TYPE_RE + '[\\*&\\s]+)+' + FUNCTION_TITLE,
        returnBegin: true,
        end: /[{;=]/,
        excludeEnd: true,
        keywords: KEYWORDS,
        illegal: /[^\w\s\*&:<>.]/,
        contains: [{
          // to prevent it from being confused as the function title
          begin: DECLTYPE_AUTO_RE,
          keywords: KEYWORDS,
          relevance: 0
        }, {
          begin: FUNCTION_TITLE,
          returnBegin: true,
          contains: [hljs.inherit(TITLE_MODE, {
            className: "title.function"
          })],
          relevance: 0
        },
        // allow for multiple declarations, e.g.:
        // extern void f(int), g(char);
        {
          relevance: 0,
          match: /,/
        }, {
          className: 'params',
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          relevance: 0,
          contains: [C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, STRINGS, NUMBERS, TYPES,
          // Count matching parentheses.
          {
            begin: /\(/,
            end: /\)/,
            keywords: KEYWORDS,
            relevance: 0,
            contains: ['self', C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, STRINGS, NUMBERS, TYPES]
          }]
        }, TYPES, C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, PREPROCESSOR]
      };
      return {
        name: "C",
        aliases: ['h'],
        keywords: KEYWORDS,
        // Until differentiations are added between `c` and `cpp`, `c` will
        // not be auto-detected to avoid auto-detect conflicts between C and C++
        disableAutodetect: true,
        illegal: '</',
        contains: [].concat(EXPRESSION_CONTEXT, FUNCTION_DECLARATION, EXPRESSION_CONTAINS, [PREPROCESSOR, {
          begin: hljs.IDENT_RE + '::',
          keywords: KEYWORDS
        }, {
          className: 'class',
          beginKeywords: 'enum class struct union',
          end: /[{;:<>=]/,
          contains: [{
            beginKeywords: "final class struct"
          }, hljs.TITLE_MODE]
        }]),
        exports: {
          preprocessor: PREPROCESSOR,
          strings: STRINGS,
          keywords: KEYWORDS
        }
      };
    }
    c_1 = c;
    return c_1;
  }

  /*
  Language: C++
  Category: common, system
  Website: https://isocpp.org
  */
  var cpp_1;
  var hasRequiredCpp;
  function requireCpp() {
    if (hasRequiredCpp) return cpp_1;
    hasRequiredCpp = 1;
    /** @type LanguageFn */
    function cpp(hljs) {
      const regex = hljs.regex;
      // added for historic reasons because `hljs.C_LINE_COMMENT_MODE` does
      // not include such support nor can we be sure all the grammars depending
      // on it would desire this behavior
      const C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$', {
        contains: [{
          begin: /\\\n/
        }]
      });
      const DECLTYPE_AUTO_RE = 'decltype\\(auto\\)';
      const NAMESPACE_RE = '[a-zA-Z_]\\w*::';
      const TEMPLATE_ARGUMENT_RE = '<[^<>]+>';
      const FUNCTION_TYPE_RE = '(?!struct)(' + DECLTYPE_AUTO_RE + '|' + regex.optional(NAMESPACE_RE) + '[a-zA-Z_]\\w*' + regex.optional(TEMPLATE_ARGUMENT_RE) + ')';
      const CPP_PRIMITIVE_TYPES = {
        className: 'type',
        begin: '\\b[a-z\\d_]*_t\\b'
      };

      // https://en.cppreference.com/w/cpp/language/escape
      // \\ \x \xFF \u2837 \u00323747 \374
      const CHARACTER_ESCAPES = '\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)';
      const STRINGS = {
        className: 'string',
        variants: [{
          begin: '(u8?|U|L)?"',
          end: '"',
          illegal: '\\n',
          contains: [hljs.BACKSLASH_ESCAPE]
        }, {
          begin: '(u8?|U|L)?\'(' + CHARACTER_ESCAPES + '|.)',
          end: '\'',
          illegal: '.'
        }, hljs.END_SAME_AS_BEGIN({
          begin: /(?:u8?|U|L)?R"([^()\\ ]{0,16})\(/,
          end: /\)([^()\\ ]{0,16})"/
        })]
      };
      const NUMBERS = {
        className: 'number',
        variants: [{
          begin: '\\b(0b[01\']+)'
        }, {
          begin: '(-?)\\b([\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)((ll|LL|l|L)(u|U)?|(u|U)(ll|LL|l|L)?|f|F|b|B)'
        }, {
          begin: '(-?)(\\b0[xX][a-fA-F0-9\']+|(\\b[\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)([eE][-+]?[\\d\']+)?)'
        }],
        relevance: 0
      };
      const PREPROCESSOR = {
        className: 'meta',
        begin: /#\s*[a-z]+\b/,
        end: /$/,
        keywords: {
          keyword: 'if else elif endif define undef warning error line ' + 'pragma _Pragma ifdef ifndef include'
        },
        contains: [{
          begin: /\\\n/,
          relevance: 0
        }, hljs.inherit(STRINGS, {
          className: 'string'
        }), {
          className: 'string',
          begin: /<.*?>/
        }, C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE]
      };
      const TITLE_MODE = {
        className: 'title',
        begin: regex.optional(NAMESPACE_RE) + hljs.IDENT_RE,
        relevance: 0
      };
      const FUNCTION_TITLE = regex.optional(NAMESPACE_RE) + hljs.IDENT_RE + '\\s*\\(';

      // https://en.cppreference.com/w/cpp/keyword
      const RESERVED_KEYWORDS = ['alignas', 'alignof', 'and', 'and_eq', 'asm', 'atomic_cancel', 'atomic_commit', 'atomic_noexcept', 'auto', 'bitand', 'bitor', 'break', 'case', 'catch', 'class', 'co_await', 'co_return', 'co_yield', 'compl', 'concept', 'const_cast|10', 'consteval', 'constexpr', 'constinit', 'continue', 'decltype', 'default', 'delete', 'do', 'dynamic_cast|10', 'else', 'enum', 'explicit', 'export', 'extern', 'false', 'final', 'for', 'friend', 'goto', 'if', 'import', 'inline', 'module', 'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq', 'override', 'private', 'protected', 'public', 'reflexpr', 'register', 'reinterpret_cast|10', 'requires', 'return', 'sizeof', 'static_assert', 'static_cast|10', 'struct', 'switch', 'synchronized', 'template', 'this', 'thread_local', 'throw', 'transaction_safe', 'transaction_safe_dynamic', 'true', 'try', 'typedef', 'typeid', 'typename', 'union', 'using', 'virtual', 'volatile', 'while', 'xor', 'xor_eq'];

      // https://en.cppreference.com/w/cpp/keyword
      const RESERVED_TYPES = ['bool', 'char', 'char16_t', 'char32_t', 'char8_t', 'double', 'float', 'int', 'long', 'short', 'void', 'wchar_t', 'unsigned', 'signed', 'const', 'static'];
      const TYPE_HINTS = ['any', 'auto_ptr', 'barrier', 'binary_semaphore', 'bitset', 'complex', 'condition_variable', 'condition_variable_any', 'counting_semaphore', 'deque', 'false_type', 'future', 'imaginary', 'initializer_list', 'istringstream', 'jthread', 'latch', 'lock_guard', 'multimap', 'multiset', 'mutex', 'optional', 'ostringstream', 'packaged_task', 'pair', 'promise', 'priority_queue', 'queue', 'recursive_mutex', 'recursive_timed_mutex', 'scoped_lock', 'set', 'shared_future', 'shared_lock', 'shared_mutex', 'shared_timed_mutex', 'shared_ptr', 'stack', 'string_view', 'stringstream', 'timed_mutex', 'thread', 'true_type', 'tuple', 'unique_lock', 'unique_ptr', 'unordered_map', 'unordered_multimap', 'unordered_multiset', 'unordered_set', 'variant', 'vector', 'weak_ptr', 'wstring', 'wstring_view'];
      const FUNCTION_HINTS = ['abort', 'abs', 'acos', 'apply', 'as_const', 'asin', 'atan', 'atan2', 'calloc', 'ceil', 'cerr', 'cin', 'clog', 'cos', 'cosh', 'cout', 'declval', 'endl', 'exchange', 'exit', 'exp', 'fabs', 'floor', 'fmod', 'forward', 'fprintf', 'fputs', 'free', 'frexp', 'fscanf', 'future', 'invoke', 'isalnum', 'isalpha', 'iscntrl', 'isdigit', 'isgraph', 'islower', 'isprint', 'ispunct', 'isspace', 'isupper', 'isxdigit', 'labs', 'launder', 'ldexp', 'log', 'log10', 'make_pair', 'make_shared', 'make_shared_for_overwrite', 'make_tuple', 'make_unique', 'malloc', 'memchr', 'memcmp', 'memcpy', 'memset', 'modf', 'move', 'pow', 'printf', 'putchar', 'puts', 'realloc', 'scanf', 'sin', 'sinh', 'snprintf', 'sprintf', 'sqrt', 'sscanf', 'std', 'stderr', 'stdin', 'stdout', 'strcat', 'strchr', 'strcmp', 'strcpy', 'strcspn', 'strlen', 'strncat', 'strncmp', 'strncpy', 'strpbrk', 'strrchr', 'strspn', 'strstr', 'swap', 'tan', 'tanh', 'terminate', 'to_underlying', 'tolower', 'toupper', 'vfprintf', 'visit', 'vprintf', 'vsprintf'];
      const LITERALS = ['NULL', 'false', 'nullopt', 'nullptr', 'true'];

      // https://en.cppreference.com/w/cpp/keyword
      const BUILT_IN = ['_Pragma'];
      const CPP_KEYWORDS = {
        type: RESERVED_TYPES,
        keyword: RESERVED_KEYWORDS,
        literal: LITERALS,
        built_in: BUILT_IN,
        _type_hints: TYPE_HINTS
      };
      const FUNCTION_DISPATCH = {
        className: 'function.dispatch',
        relevance: 0,
        keywords: {
          // Only for relevance, not highlighting.
          _hint: FUNCTION_HINTS
        },
        begin: regex.concat(/\b/, /(?!decltype)/, /(?!if)/, /(?!for)/, /(?!switch)/, /(?!while)/, hljs.IDENT_RE, regex.lookahead(/(<[^<>]+>|)\s*\(/))
      };
      const EXPRESSION_CONTAINS = [FUNCTION_DISPATCH, PREPROCESSOR, CPP_PRIMITIVE_TYPES, C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, NUMBERS, STRINGS];
      const EXPRESSION_CONTEXT = {
        // This mode covers expression context where we can't expect a function
        // definition and shouldn't highlight anything that looks like one:
        // `return some()`, `else if()`, `(x*sum(1, 2))`
        variants: [{
          begin: /=/,
          end: /;/
        }, {
          begin: /\(/,
          end: /\)/
        }, {
          beginKeywords: 'new throw return else',
          end: /;/
        }],
        keywords: CPP_KEYWORDS,
        contains: EXPRESSION_CONTAINS.concat([{
          begin: /\(/,
          end: /\)/,
          keywords: CPP_KEYWORDS,
          contains: EXPRESSION_CONTAINS.concat(['self']),
          relevance: 0
        }]),
        relevance: 0
      };
      const FUNCTION_DECLARATION = {
        className: 'function',
        begin: '(' + FUNCTION_TYPE_RE + '[\\*&\\s]+)+' + FUNCTION_TITLE,
        returnBegin: true,
        end: /[{;=]/,
        excludeEnd: true,
        keywords: CPP_KEYWORDS,
        illegal: /[^\w\s\*&:<>.]/,
        contains: [{
          // to prevent it from being confused as the function title
          begin: DECLTYPE_AUTO_RE,
          keywords: CPP_KEYWORDS,
          relevance: 0
        }, {
          begin: FUNCTION_TITLE,
          returnBegin: true,
          contains: [TITLE_MODE],
          relevance: 0
        },
        // needed because we do not have look-behind on the below rule
        // to prevent it from grabbing the final : in a :: pair
        {
          begin: /::/,
          relevance: 0
        },
        // initializers
        {
          begin: /:/,
          endsWithParent: true,
          contains: [STRINGS, NUMBERS]
        },
        // allow for multiple declarations, e.g.:
        // extern void f(int), g(char);
        {
          relevance: 0,
          match: /,/
        }, {
          className: 'params',
          begin: /\(/,
          end: /\)/,
          keywords: CPP_KEYWORDS,
          relevance: 0,
          contains: [C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, STRINGS, NUMBERS, CPP_PRIMITIVE_TYPES,
          // Count matching parentheses.
          {
            begin: /\(/,
            end: /\)/,
            keywords: CPP_KEYWORDS,
            relevance: 0,
            contains: ['self', C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, STRINGS, NUMBERS, CPP_PRIMITIVE_TYPES]
          }]
        }, CPP_PRIMITIVE_TYPES, C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, PREPROCESSOR]
      };
      return {
        name: 'C++',
        aliases: ['cc', 'c++', 'h++', 'hpp', 'hh', 'hxx', 'cxx'],
        keywords: CPP_KEYWORDS,
        illegal: '</',
        classNameAliases: {
          'function.dispatch': 'built_in'
        },
        contains: [].concat(EXPRESSION_CONTEXT, FUNCTION_DECLARATION, FUNCTION_DISPATCH, EXPRESSION_CONTAINS, [PREPROCESSOR, {
          // containers: ie, `vector <int> rooms (9);`
          begin: '\\b(deque|list|queue|priority_queue|pair|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array|tuple|optional|variant|function)\\s*<(?!<)',
          end: '>',
          keywords: CPP_KEYWORDS,
          contains: ['self', CPP_PRIMITIVE_TYPES]
        }, {
          begin: hljs.IDENT_RE + '::',
          keywords: CPP_KEYWORDS
        }, {
          match: [
          // extra complexity to deal with `enum class` and `enum struct`
          /\b(?:enum(?:\s+(?:class|struct))?|class|struct|union)/, /\s+/, /\w+/],
          className: {
            1: 'keyword',
            3: 'title.class'
          }
        }])
      };
    }
    cpp_1 = cpp;
    return cpp_1;
  }

  /*
  Language: C#
  Author: Jason Diamond <jason@diamond.name>
  Contributor: Nicolas LLOBERA <nllobera@gmail.com>, Pieter Vantorre <pietervantorre@gmail.com>, David Pine <david.pine@microsoft.com>
  Website: https://docs.microsoft.com/dotnet/csharp/
  Category: common
  */
  var csharp_1;
  var hasRequiredCsharp;
  function requireCsharp() {
    if (hasRequiredCsharp) return csharp_1;
    hasRequiredCsharp = 1;
    /** @type LanguageFn */
    function csharp(hljs) {
      const BUILT_IN_KEYWORDS = ['bool', 'byte', 'char', 'decimal', 'delegate', 'double', 'dynamic', 'enum', 'float', 'int', 'long', 'nint', 'nuint', 'object', 'sbyte', 'short', 'string', 'ulong', 'uint', 'ushort'];
      const FUNCTION_MODIFIERS = ['public', 'private', 'protected', 'static', 'internal', 'protected', 'abstract', 'async', 'extern', 'override', 'unsafe', 'virtual', 'new', 'sealed', 'partial'];
      const LITERAL_KEYWORDS = ['default', 'false', 'null', 'true'];
      const NORMAL_KEYWORDS = ['abstract', 'as', 'base', 'break', 'case', 'catch', 'class', 'const', 'continue', 'do', 'else', 'event', 'explicit', 'extern', 'finally', 'fixed', 'for', 'foreach', 'goto', 'if', 'implicit', 'in', 'interface', 'internal', 'is', 'lock', 'namespace', 'new', 'operator', 'out', 'override', 'params', 'private', 'protected', 'public', 'readonly', 'record', 'ref', 'return', 'scoped', 'sealed', 'sizeof', 'stackalloc', 'static', 'struct', 'switch', 'this', 'throw', 'try', 'typeof', 'unchecked', 'unsafe', 'using', 'virtual', 'void', 'volatile', 'while'];
      const CONTEXTUAL_KEYWORDS = ['add', 'alias', 'and', 'ascending', 'async', 'await', 'by', 'descending', 'equals', 'from', 'get', 'global', 'group', 'init', 'into', 'join', 'let', 'nameof', 'not', 'notnull', 'on', 'or', 'orderby', 'partial', 'remove', 'select', 'set', 'unmanaged', 'value|0', 'var', 'when', 'where', 'with', 'yield'];
      const KEYWORDS = {
        keyword: NORMAL_KEYWORDS.concat(CONTEXTUAL_KEYWORDS),
        built_in: BUILT_IN_KEYWORDS,
        literal: LITERAL_KEYWORDS
      };
      const TITLE_MODE = hljs.inherit(hljs.TITLE_MODE, {
        begin: '[a-zA-Z](\\.?\\w)*'
      });
      const NUMBERS = {
        className: 'number',
        variants: [{
          begin: '\\b(0b[01\']+)'
        }, {
          begin: '(-?)\\b([\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)(u|U|l|L|ul|UL|f|F|b|B)'
        }, {
          begin: '(-?)(\\b0[xX][a-fA-F0-9\']+|(\\b[\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)([eE][-+]?[\\d\']+)?)'
        }],
        relevance: 0
      };
      const VERBATIM_STRING = {
        className: 'string',
        begin: '@"',
        end: '"',
        contains: [{
          begin: '""'
        }]
      };
      const VERBATIM_STRING_NO_LF = hljs.inherit(VERBATIM_STRING, {
        illegal: /\n/
      });
      const SUBST = {
        className: 'subst',
        begin: /\{/,
        end: /\}/,
        keywords: KEYWORDS
      };
      const SUBST_NO_LF = hljs.inherit(SUBST, {
        illegal: /\n/
      });
      const INTERPOLATED_STRING = {
        className: 'string',
        begin: /\$"/,
        end: '"',
        illegal: /\n/,
        contains: [{
          begin: /\{\{/
        }, {
          begin: /\}\}/
        }, hljs.BACKSLASH_ESCAPE, SUBST_NO_LF]
      };
      const INTERPOLATED_VERBATIM_STRING = {
        className: 'string',
        begin: /\$@"/,
        end: '"',
        contains: [{
          begin: /\{\{/
        }, {
          begin: /\}\}/
        }, {
          begin: '""'
        }, SUBST]
      };
      const INTERPOLATED_VERBATIM_STRING_NO_LF = hljs.inherit(INTERPOLATED_VERBATIM_STRING, {
        illegal: /\n/,
        contains: [{
          begin: /\{\{/
        }, {
          begin: /\}\}/
        }, {
          begin: '""'
        }, SUBST_NO_LF]
      });
      SUBST.contains = [INTERPOLATED_VERBATIM_STRING, INTERPOLATED_STRING, VERBATIM_STRING, hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE, NUMBERS, hljs.C_BLOCK_COMMENT_MODE];
      SUBST_NO_LF.contains = [INTERPOLATED_VERBATIM_STRING_NO_LF, INTERPOLATED_STRING, VERBATIM_STRING_NO_LF, hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE, NUMBERS, hljs.inherit(hljs.C_BLOCK_COMMENT_MODE, {
        illegal: /\n/
      })];
      const STRING = {
        variants: [INTERPOLATED_VERBATIM_STRING, INTERPOLATED_STRING, VERBATIM_STRING, hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE]
      };
      const GENERIC_MODIFIER = {
        begin: "<",
        end: ">",
        contains: [{
          beginKeywords: "in out"
        }, TITLE_MODE]
      };
      const TYPE_IDENT_RE = hljs.IDENT_RE + '(<' + hljs.IDENT_RE + '(\\s*,\\s*' + hljs.IDENT_RE + ')*>)?(\\[\\])?';
      const AT_IDENTIFIER = {
        // prevents expressions like `@class` from incorrect flagging
        // `class` as a keyword
        begin: "@" + hljs.IDENT_RE,
        relevance: 0
      };
      return {
        name: 'C#',
        aliases: ['cs', 'c#'],
        keywords: KEYWORDS,
        illegal: /::/,
        contains: [hljs.COMMENT('///', '$', {
          returnBegin: true,
          contains: [{
            className: 'doctag',
            variants: [{
              begin: '///',
              relevance: 0
            }, {
              begin: '<!--|-->'
            }, {
              begin: '</?',
              end: '>'
            }]
          }]
        }), hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, {
          className: 'meta',
          begin: '#',
          end: '$',
          keywords: {
            keyword: 'if else elif endif define undef warning error line region endregion pragma checksum'
          }
        }, STRING, NUMBERS, {
          beginKeywords: 'class interface',
          relevance: 0,
          end: /[{;=]/,
          illegal: /[^\s:,]/,
          contains: [{
            beginKeywords: "where class"
          }, TITLE_MODE, GENERIC_MODIFIER, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE]
        }, {
          beginKeywords: 'namespace',
          relevance: 0,
          end: /[{;=]/,
          illegal: /[^\s:]/,
          contains: [TITLE_MODE, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE]
        }, {
          beginKeywords: 'record',
          relevance: 0,
          end: /[{;=]/,
          illegal: /[^\s:]/,
          contains: [TITLE_MODE, GENERIC_MODIFIER, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE]
        }, {
          // [Attributes("")]
          className: 'meta',
          begin: '^\\s*\\[(?=[\\w])',
          excludeBegin: true,
          end: '\\]',
          excludeEnd: true,
          contains: [{
            className: 'string',
            begin: /"/,
            end: /"/
          }]
        }, {
          // Expression keywords prevent 'keyword Name(...)' from being
          // recognized as a function definition
          beginKeywords: 'new return throw await else',
          relevance: 0
        }, {
          className: 'function',
          begin: '(' + TYPE_IDENT_RE + '\\s+)+' + hljs.IDENT_RE + '\\s*(<[^=]+>\\s*)?\\(',
          returnBegin: true,
          end: /\s*[{;=]/,
          excludeEnd: true,
          keywords: KEYWORDS,
          contains: [
          // prevents these from being highlighted `title`
          {
            beginKeywords: FUNCTION_MODIFIERS.join(" "),
            relevance: 0
          }, {
            begin: hljs.IDENT_RE + '\\s*(<[^=]+>\\s*)?\\(',
            returnBegin: true,
            contains: [hljs.TITLE_MODE, GENERIC_MODIFIER],
            relevance: 0
          }, {
            match: /\(\)/
          }, {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            excludeBegin: true,
            excludeEnd: true,
            keywords: KEYWORDS,
            relevance: 0,
            contains: [STRING, NUMBERS, hljs.C_BLOCK_COMMENT_MODE]
          }, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE]
        }, AT_IDENTIFIER]
      };
    }
    csharp_1 = csharp;
    return csharp_1;
  }

  var css_1;
  var hasRequiredCss;
  function requireCss() {
    if (hasRequiredCss) return css_1;
    hasRequiredCss = 1;
    const MODES = hljs => {
      return {
        IMPORTANT: {
          scope: 'meta',
          begin: '!important'
        },
        BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
        HEXCOLOR: {
          scope: 'number',
          begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
        },
        FUNCTION_DISPATCH: {
          className: "built_in",
          begin: /[\w-]+(?=\()/
        },
        ATTRIBUTE_SELECTOR_MODE: {
          scope: 'selector-attr',
          begin: /\[/,
          end: /\]/,
          illegal: '$',
          contains: [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE]
        },
        CSS_NUMBER_MODE: {
          scope: 'number',
          begin: hljs.NUMBER_RE + '(' + '%|em|ex|ch|rem' + '|vw|vh|vmin|vmax' + '|cm|mm|in|pt|pc|px' + '|deg|grad|rad|turn' + '|s|ms' + '|Hz|kHz' + '|dpi|dpcm|dppx' + ')?',
          relevance: 0
        },
        CSS_VARIABLE: {
          className: "attr",
          begin: /--[A-Za-z][A-Za-z0-9_-]*/
        }
      };
    };
    const TAGS = ['a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'blockquote', 'body', 'button', 'canvas', 'caption', 'cite', 'code', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'mark', 'menu', 'nav', 'object', 'ol', 'p', 'q', 'quote', 'samp', 'section', 'span', 'strong', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'ul', 'var', 'video'];
    const MEDIA_FEATURES = ['any-hover', 'any-pointer', 'aspect-ratio', 'color', 'color-gamut', 'color-index', 'device-aspect-ratio', 'device-height', 'device-width', 'display-mode', 'forced-colors', 'grid', 'height', 'hover', 'inverted-colors', 'monochrome', 'orientation', 'overflow-block', 'overflow-inline', 'pointer', 'prefers-color-scheme', 'prefers-contrast', 'prefers-reduced-motion', 'prefers-reduced-transparency', 'resolution', 'scan', 'scripting', 'update', 'width',
    // TODO: find a better solution?
    'min-width', 'max-width', 'min-height', 'max-height'];

    // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
    const PSEUDO_CLASSES = ['active', 'any-link', 'blank', 'checked', 'current', 'default', 'defined', 'dir',
    // dir()
    'disabled', 'drop', 'empty', 'enabled', 'first', 'first-child', 'first-of-type', 'fullscreen', 'future', 'focus', 'focus-visible', 'focus-within', 'has',
    // has()
    'host',
    // host or host()
    'host-context',
    // host-context()
    'hover', 'indeterminate', 'in-range', 'invalid', 'is',
    // is()
    'lang',
    // lang()
    'last-child', 'last-of-type', 'left', 'link', 'local-link', 'not',
    // not()
    'nth-child',
    // nth-child()
    'nth-col',
    // nth-col()
    'nth-last-child',
    // nth-last-child()
    'nth-last-col',
    // nth-last-col()
    'nth-last-of-type',
    //nth-last-of-type()
    'nth-of-type',
    //nth-of-type()
    'only-child', 'only-of-type', 'optional', 'out-of-range', 'past', 'placeholder-shown', 'read-only', 'read-write', 'required', 'right', 'root', 'scope', 'target', 'target-within', 'user-invalid', 'valid', 'visited', 'where' // where()
    ];

    // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
    const PSEUDO_ELEMENTS = ['after', 'backdrop', 'before', 'cue', 'cue-region', 'first-letter', 'first-line', 'grammar-error', 'marker', 'part', 'placeholder', 'selection', 'slotted', 'spelling-error'];
    const ATTRIBUTES = ['align-content', 'align-items', 'align-self', 'all', 'animation', 'animation-delay', 'animation-direction', 'animation-duration', 'animation-fill-mode', 'animation-iteration-count', 'animation-name', 'animation-play-state', 'animation-timing-function', 'backface-visibility', 'background', 'background-attachment', 'background-blend-mode', 'background-clip', 'background-color', 'background-image', 'background-origin', 'background-position', 'background-repeat', 'background-size', 'block-size', 'border', 'border-block', 'border-block-color', 'border-block-end', 'border-block-end-color', 'border-block-end-style', 'border-block-end-width', 'border-block-start', 'border-block-start-color', 'border-block-start-style', 'border-block-start-width', 'border-block-style', 'border-block-width', 'border-bottom', 'border-bottom-color', 'border-bottom-left-radius', 'border-bottom-right-radius', 'border-bottom-style', 'border-bottom-width', 'border-collapse', 'border-color', 'border-image', 'border-image-outset', 'border-image-repeat', 'border-image-slice', 'border-image-source', 'border-image-width', 'border-inline', 'border-inline-color', 'border-inline-end', 'border-inline-end-color', 'border-inline-end-style', 'border-inline-end-width', 'border-inline-start', 'border-inline-start-color', 'border-inline-start-style', 'border-inline-start-width', 'border-inline-style', 'border-inline-width', 'border-left', 'border-left-color', 'border-left-style', 'border-left-width', 'border-radius', 'border-right', 'border-right-color', 'border-right-style', 'border-right-width', 'border-spacing', 'border-style', 'border-top', 'border-top-color', 'border-top-left-radius', 'border-top-right-radius', 'border-top-style', 'border-top-width', 'border-width', 'bottom', 'box-decoration-break', 'box-shadow', 'box-sizing', 'break-after', 'break-before', 'break-inside', 'caption-side', 'caret-color', 'clear', 'clip', 'clip-path', 'clip-rule', 'color', 'column-count', 'column-fill', 'column-gap', 'column-rule', 'column-rule-color', 'column-rule-style', 'column-rule-width', 'column-span', 'column-width', 'columns', 'contain', 'content', 'content-visibility', 'counter-increment', 'counter-reset', 'cue', 'cue-after', 'cue-before', 'cursor', 'direction', 'display', 'empty-cells', 'filter', 'flex', 'flex-basis', 'flex-direction', 'flex-flow', 'flex-grow', 'flex-shrink', 'flex-wrap', 'float', 'flow', 'font', 'font-display', 'font-family', 'font-feature-settings', 'font-kerning', 'font-language-override', 'font-size', 'font-size-adjust', 'font-smoothing', 'font-stretch', 'font-style', 'font-synthesis', 'font-variant', 'font-variant-caps', 'font-variant-east-asian', 'font-variant-ligatures', 'font-variant-numeric', 'font-variant-position', 'font-variation-settings', 'font-weight', 'gap', 'glyph-orientation-vertical', 'grid', 'grid-area', 'grid-auto-columns', 'grid-auto-flow', 'grid-auto-rows', 'grid-column', 'grid-column-end', 'grid-column-start', 'grid-gap', 'grid-row', 'grid-row-end', 'grid-row-start', 'grid-template', 'grid-template-areas', 'grid-template-columns', 'grid-template-rows', 'hanging-punctuation', 'height', 'hyphens', 'icon', 'image-orientation', 'image-rendering', 'image-resolution', 'ime-mode', 'inline-size', 'isolation', 'justify-content', 'left', 'letter-spacing', 'line-break', 'line-height', 'list-style', 'list-style-image', 'list-style-position', 'list-style-type', 'margin', 'margin-block', 'margin-block-end', 'margin-block-start', 'margin-bottom', 'margin-inline', 'margin-inline-end', 'margin-inline-start', 'margin-left', 'margin-right', 'margin-top', 'marks', 'mask', 'mask-border', 'mask-border-mode', 'mask-border-outset', 'mask-border-repeat', 'mask-border-slice', 'mask-border-source', 'mask-border-width', 'mask-clip', 'mask-composite', 'mask-image', 'mask-mode', 'mask-origin', 'mask-position', 'mask-repeat', 'mask-size', 'mask-type', 'max-block-size', 'max-height', 'max-inline-size', 'max-width', 'min-block-size', 'min-height', 'min-inline-size', 'min-width', 'mix-blend-mode', 'nav-down', 'nav-index', 'nav-left', 'nav-right', 'nav-up', 'none', 'normal', 'object-fit', 'object-position', 'opacity', 'order', 'orphans', 'outline', 'outline-color', 'outline-offset', 'outline-style', 'outline-width', 'overflow', 'overflow-wrap', 'overflow-x', 'overflow-y', 'padding', 'padding-block', 'padding-block-end', 'padding-block-start', 'padding-bottom', 'padding-inline', 'padding-inline-end', 'padding-inline-start', 'padding-left', 'padding-right', 'padding-top', 'page-break-after', 'page-break-before', 'page-break-inside', 'pause', 'pause-after', 'pause-before', 'perspective', 'perspective-origin', 'pointer-events', 'position', 'quotes', 'resize', 'rest', 'rest-after', 'rest-before', 'right', 'row-gap', 'scroll-margin', 'scroll-margin-block', 'scroll-margin-block-end', 'scroll-margin-block-start', 'scroll-margin-bottom', 'scroll-margin-inline', 'scroll-margin-inline-end', 'scroll-margin-inline-start', 'scroll-margin-left', 'scroll-margin-right', 'scroll-margin-top', 'scroll-padding', 'scroll-padding-block', 'scroll-padding-block-end', 'scroll-padding-block-start', 'scroll-padding-bottom', 'scroll-padding-inline', 'scroll-padding-inline-end', 'scroll-padding-inline-start', 'scroll-padding-left', 'scroll-padding-right', 'scroll-padding-top', 'scroll-snap-align', 'scroll-snap-stop', 'scroll-snap-type', 'scrollbar-color', 'scrollbar-gutter', 'scrollbar-width', 'shape-image-threshold', 'shape-margin', 'shape-outside', 'speak', 'speak-as', 'src',
    // @font-face
    'tab-size', 'table-layout', 'text-align', 'text-align-all', 'text-align-last', 'text-combine-upright', 'text-decoration', 'text-decoration-color', 'text-decoration-line', 'text-decoration-style', 'text-emphasis', 'text-emphasis-color', 'text-emphasis-position', 'text-emphasis-style', 'text-indent', 'text-justify', 'text-orientation', 'text-overflow', 'text-rendering', 'text-shadow', 'text-transform', 'text-underline-position', 'top', 'transform', 'transform-box', 'transform-origin', 'transform-style', 'transition', 'transition-delay', 'transition-duration', 'transition-property', 'transition-timing-function', 'unicode-bidi', 'vertical-align', 'visibility', 'voice-balance', 'voice-duration', 'voice-family', 'voice-pitch', 'voice-range', 'voice-rate', 'voice-stress', 'voice-volume', 'white-space', 'widows', 'width', 'will-change', 'word-break', 'word-spacing', 'word-wrap', 'writing-mode', 'z-index'
    // reverse makes sure longer attributes `font-weight` are matched fully
    // instead of getting false positives on say `font`
    ].reverse();

    /*
    Language: CSS
    Category: common, css, web
    Website: https://developer.mozilla.org/en-US/docs/Web/CSS
    */

    /** @type LanguageFn */
    function css(hljs) {
      const regex = hljs.regex;
      const modes = MODES(hljs);
      const VENDOR_PREFIX = {
        begin: /-(webkit|moz|ms|o)-(?=[a-z])/
      };
      const AT_MODIFIERS = "and or not only";
      const AT_PROPERTY_RE = /@-?\w[\w]*(-\w+)*/; // @-webkit-keyframes
      const IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
      const STRINGS = [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE];
      return {
        name: 'CSS',
        case_insensitive: true,
        illegal: /[=|'\$]/,
        keywords: {
          keyframePosition: "from to"
        },
        classNameAliases: {
          // for visual continuity with `tag {}` and because we
          // don't have a great class for this?
          keyframePosition: "selector-tag"
        },
        contains: [modes.BLOCK_COMMENT, VENDOR_PREFIX,
        // to recognize keyframe 40% etc which are outside the scope of our
        // attribute value mode
        modes.CSS_NUMBER_MODE, {
          className: 'selector-id',
          begin: /#[A-Za-z0-9_-]+/,
          relevance: 0
        }, {
          className: 'selector-class',
          begin: '\\.' + IDENT_RE,
          relevance: 0
        }, modes.ATTRIBUTE_SELECTOR_MODE, {
          className: 'selector-pseudo',
          variants: [{
            begin: ':(' + PSEUDO_CLASSES.join('|') + ')'
          }, {
            begin: ':(:)?(' + PSEUDO_ELEMENTS.join('|') + ')'
          }]
        },
        // we may actually need this (12/2020)
        // { // pseudo-selector params
        //   begin: /\(/,
        //   end: /\)/,
        //   contains: [ hljs.CSS_NUMBER_MODE ]
        // },
        modes.CSS_VARIABLE, {
          className: 'attribute',
          begin: '\\b(' + ATTRIBUTES.join('|') + ')\\b'
        },
        // attribute values
        {
          begin: /:/,
          end: /[;}{]/,
          contains: [modes.BLOCK_COMMENT, modes.HEXCOLOR, modes.IMPORTANT, modes.CSS_NUMBER_MODE, ...STRINGS,
          // needed to highlight these as strings and to avoid issues with
          // illegal characters that might be inside urls that would tigger the
          // languages illegal stack
          {
            begin: /(url|data-uri)\(/,
            end: /\)/,
            relevance: 0,
            // from keywords
            keywords: {
              built_in: "url data-uri"
            },
            contains: [...STRINGS, {
              className: "string",
              // any character other than `)` as in `url()` will be the start
              // of a string, which ends with `)` (from the parent mode)
              begin: /[^)]/,
              endsWithParent: true,
              excludeEnd: true
            }]
          }, modes.FUNCTION_DISPATCH]
        }, {
          begin: regex.lookahead(/@/),
          end: '[{;]',
          relevance: 0,
          illegal: /:/,
          // break on Less variables @var: ...
          contains: [{
            className: 'keyword',
            begin: AT_PROPERTY_RE
          }, {
            begin: /\s/,
            endsWithParent: true,
            excludeEnd: true,
            relevance: 0,
            keywords: {
              $pattern: /[a-z-]+/,
              keyword: AT_MODIFIERS,
              attribute: MEDIA_FEATURES.join(" ")
            },
            contains: [{
              begin: /[a-z-]+(?=:)/,
              className: "attribute"
            }, ...STRINGS, modes.CSS_NUMBER_MODE]
          }]
        }, {
          className: 'selector-tag',
          begin: '\\b(' + TAGS.join('|') + ')\\b'
        }]
      };
    }
    css_1 = css;
    return css_1;
  }

  /*
  Language: Markdown
  Requires: xml.js
  Author: John Crepezzi <john.crepezzi@gmail.com>
  Website: https://daringfireball.net/projects/markdown/
  Category: common, markup
  */
  var markdown_1;
  var hasRequiredMarkdown;
  function requireMarkdown() {
    if (hasRequiredMarkdown) return markdown_1;
    hasRequiredMarkdown = 1;
    function markdown(hljs) {
      const regex = hljs.regex;
      const INLINE_HTML = {
        begin: /<\/?[A-Za-z_]/,
        end: '>',
        subLanguage: 'xml',
        relevance: 0
      };
      const HORIZONTAL_RULE = {
        begin: '^[-\\*]{3,}',
        end: '$'
      };
      const CODE = {
        className: 'code',
        variants: [
        // TODO: fix to allow these to work with sublanguage also
        {
          begin: '(`{3,})[^`](.|\\n)*?\\1`*[ ]*'
        }, {
          begin: '(~{3,})[^~](.|\\n)*?\\1~*[ ]*'
        },
        // needed to allow markdown as a sublanguage to work
        {
          begin: '```',
          end: '```+[ ]*$'
        }, {
          begin: '~~~',
          end: '~~~+[ ]*$'
        }, {
          begin: '`.+?`'
        }, {
          begin: '(?=^( {4}|\\t))',
          // use contains to gobble up multiple lines to allow the block to be whatever size
          // but only have a single open/close tag vs one per line
          contains: [{
            begin: '^( {4}|\\t)',
            end: '(\\n)$'
          }],
          relevance: 0
        }]
      };
      const LIST = {
        className: 'bullet',
        begin: '^[ \t]*([*+-]|(\\d+\\.))(?=\\s+)',
        end: '\\s+',
        excludeEnd: true
      };
      const LINK_REFERENCE = {
        begin: /^\[[^\n]+\]:/,
        returnBegin: true,
        contains: [{
          className: 'symbol',
          begin: /\[/,
          end: /\]/,
          excludeBegin: true,
          excludeEnd: true
        }, {
          className: 'link',
          begin: /:\s*/,
          end: /$/,
          excludeBegin: true
        }]
      };
      const URL_SCHEME = /[A-Za-z][A-Za-z0-9+.-]*/;
      const LINK = {
        variants: [
        // too much like nested array access in so many languages
        // to have any real relevance
        {
          begin: /\[.+?\]\[.*?\]/,
          relevance: 0
        },
        // popular internet URLs
        {
          begin: /\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)/,
          relevance: 2
        }, {
          begin: regex.concat(/\[.+?\]\(/, URL_SCHEME, /:\/\/.*?\)/),
          relevance: 2
        },
        // relative urls
        {
          begin: /\[.+?\]\([./?&#].*?\)/,
          relevance: 1
        },
        // whatever else, lower relevance (might not be a link at all)
        {
          begin: /\[.*?\]\(.*?\)/,
          relevance: 0
        }],
        returnBegin: true,
        contains: [{
          // empty strings for alt or link text
          match: /\[(?=\])/
        }, {
          className: 'string',
          relevance: 0,
          begin: '\\[',
          end: '\\]',
          excludeBegin: true,
          returnEnd: true
        }, {
          className: 'link',
          relevance: 0,
          begin: '\\]\\(',
          end: '\\)',
          excludeBegin: true,
          excludeEnd: true
        }, {
          className: 'symbol',
          relevance: 0,
          begin: '\\]\\[',
          end: '\\]',
          excludeBegin: true,
          excludeEnd: true
        }]
      };
      const BOLD = {
        className: 'strong',
        contains: [],
        // defined later
        variants: [{
          begin: /_{2}(?!\s)/,
          end: /_{2}/
        }, {
          begin: /\*{2}(?!\s)/,
          end: /\*{2}/
        }]
      };
      const ITALIC = {
        className: 'emphasis',
        contains: [],
        // defined later
        variants: [{
          begin: /\*(?![*\s])/,
          end: /\*/
        }, {
          begin: /_(?![_\s])/,
          end: /_/,
          relevance: 0
        }]
      };

      // 3 level deep nesting is not allowed because it would create confusion
      // in cases like `***testing***` because where we don't know if the last
      // `***` is starting a new bold/italic or finishing the last one
      const BOLD_WITHOUT_ITALIC = hljs.inherit(BOLD, {
        contains: []
      });
      const ITALIC_WITHOUT_BOLD = hljs.inherit(ITALIC, {
        contains: []
      });
      BOLD.contains.push(ITALIC_WITHOUT_BOLD);
      ITALIC.contains.push(BOLD_WITHOUT_ITALIC);
      let CONTAINABLE = [INLINE_HTML, LINK];
      [BOLD, ITALIC, BOLD_WITHOUT_ITALIC, ITALIC_WITHOUT_BOLD].forEach(m => {
        m.contains = m.contains.concat(CONTAINABLE);
      });
      CONTAINABLE = CONTAINABLE.concat(BOLD, ITALIC);
      const HEADER = {
        className: 'section',
        variants: [{
          begin: '^#{1,6}',
          end: '$',
          contains: CONTAINABLE
        }, {
          begin: '(?=^.+?\\n[=-]{2,}$)',
          contains: [{
            begin: '^[=-]*$'
          }, {
            begin: '^',
            end: "\\n",
            contains: CONTAINABLE
          }]
        }]
      };
      const BLOCKQUOTE = {
        className: 'quote',
        begin: '^>\\s+',
        contains: CONTAINABLE,
        end: '$'
      };
      return {
        name: 'Markdown',
        aliases: ['md', 'mkdown', 'mkd'],
        contains: [HEADER, INLINE_HTML, LIST, BOLD, ITALIC, BLOCKQUOTE, CODE, HORIZONTAL_RULE, LINK, LINK_REFERENCE]
      };
    }
    markdown_1 = markdown;
    return markdown_1;
  }

  /*
  Language: Diff
  Description: Unified and context diff
  Author: Vasily Polovnyov <vast@whiteants.net>
  Website: https://www.gnu.org/software/diffutils/
  Category: common
  */
  var diff_1;
  var hasRequiredDiff;
  function requireDiff() {
    if (hasRequiredDiff) return diff_1;
    hasRequiredDiff = 1;
    /** @type LanguageFn */
    function diff(hljs) {
      const regex = hljs.regex;
      return {
        name: 'Diff',
        aliases: ['patch'],
        contains: [{
          className: 'meta',
          relevance: 10,
          match: regex.either(/^@@ +-\d+,\d+ +\+\d+,\d+ +@@/, /^\*\*\* +\d+,\d+ +\*\*\*\*$/, /^--- +\d+,\d+ +----$/)
        }, {
          className: 'comment',
          variants: [{
            begin: regex.either(/Index: /, /^index/, /={3,}/, /^-{3}/, /^\*{3} /, /^\+{3}/, /^diff --git/),
            end: /$/
          }, {
            match: /^\*{15}$/
          }]
        }, {
          className: 'addition',
          begin: /^\+/,
          end: /$/
        }, {
          className: 'deletion',
          begin: /^-/,
          end: /$/
        }, {
          className: 'addition',
          begin: /^!/,
          end: /$/
        }]
      };
    }
    diff_1 = diff;
    return diff_1;
  }

  /*
  Language: Ruby
  Description: Ruby is a dynamic, open source programming language with a focus on simplicity and productivity.
  Website: https://www.ruby-lang.org/
  Author: Anton Kovalyov <anton@kovalyov.net>
  Contributors: Peter Leonov <gojpeg@yandex.ru>, Vasily Polovnyov <vast@whiteants.net>, Loren Segal <lsegal@soen.ca>, Pascal Hurni <phi@ruby-reactive.org>, Cedric Sohrauer <sohrauer@googlemail.com>
  Category: common
  */
  var ruby_1;
  var hasRequiredRuby;
  function requireRuby() {
    if (hasRequiredRuby) return ruby_1;
    hasRequiredRuby = 1;
    function ruby(hljs) {
      const regex = hljs.regex;
      const RUBY_METHOD_RE = '([a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?)';
      // TODO: move concepts like CAMEL_CASE into `modes.js`
      const CLASS_NAME_RE = regex.either(/\b([A-Z]+[a-z0-9]+)+/,
      // ends in caps
      /\b([A-Z]+[a-z0-9]+)+[A-Z]+/);
      const CLASS_NAME_WITH_NAMESPACE_RE = regex.concat(CLASS_NAME_RE, /(::\w+)*/);
      // very popular ruby built-ins that one might even assume
      // are actual keywords (despite that not being the case)
      const PSEUDO_KWS = ["include", "extend", "prepend", "public", "private", "protected", "raise", "throw"];
      const RUBY_KEYWORDS = {
        "variable.constant": ["__FILE__", "__LINE__", "__ENCODING__"],
        "variable.language": ["self", "super"],
        keyword: ["alias", "and", "begin", "BEGIN", "break", "case", "class", "defined", "do", "else", "elsif", "end", "END", "ensure", "for", "if", "in", "module", "next", "not", "or", "redo", "require", "rescue", "retry", "return", "then", "undef", "unless", "until", "when", "while", "yield", ...PSEUDO_KWS],
        built_in: ["proc", "lambda", "attr_accessor", "attr_reader", "attr_writer", "define_method", "private_constant", "module_function"],
        literal: ["true", "false", "nil"]
      };
      const YARDOCTAG = {
        className: 'doctag',
        begin: '@[A-Za-z]+'
      };
      const IRB_OBJECT = {
        begin: '#<',
        end: '>'
      };
      const COMMENT_MODES = [hljs.COMMENT('#', '$', {
        contains: [YARDOCTAG]
      }), hljs.COMMENT('^=begin', '^=end', {
        contains: [YARDOCTAG],
        relevance: 10
      }), hljs.COMMENT('^__END__', hljs.MATCH_NOTHING_RE)];
      const SUBST = {
        className: 'subst',
        begin: /#\{/,
        end: /\}/,
        keywords: RUBY_KEYWORDS
      };
      const STRING = {
        className: 'string',
        contains: [hljs.BACKSLASH_ESCAPE, SUBST],
        variants: [{
          begin: /'/,
          end: /'/
        }, {
          begin: /"/,
          end: /"/
        }, {
          begin: /`/,
          end: /`/
        }, {
          begin: /%[qQwWx]?\(/,
          end: /\)/
        }, {
          begin: /%[qQwWx]?\[/,
          end: /\]/
        }, {
          begin: /%[qQwWx]?\{/,
          end: /\}/
        }, {
          begin: /%[qQwWx]?</,
          end: />/
        }, {
          begin: /%[qQwWx]?\//,
          end: /\//
        }, {
          begin: /%[qQwWx]?%/,
          end: /%/
        }, {
          begin: /%[qQwWx]?-/,
          end: /-/
        }, {
          begin: /%[qQwWx]?\|/,
          end: /\|/
        },
        // in the following expressions, \B in the beginning suppresses recognition of ?-sequences
        // where ? is the last character of a preceding identifier, as in: `func?4`
        {
          begin: /\B\?(\\\d{1,3})/
        }, {
          begin: /\B\?(\\x[A-Fa-f0-9]{1,2})/
        }, {
          begin: /\B\?(\\u\{?[A-Fa-f0-9]{1,6}\}?)/
        }, {
          begin: /\B\?(\\M-\\C-|\\M-\\c|\\c\\M-|\\M-|\\C-\\M-)[\x20-\x7e]/
        }, {
          begin: /\B\?\\(c|C-)[\x20-\x7e]/
        }, {
          begin: /\B\?\\?\S/
        },
        // heredocs
        {
          // this guard makes sure that we have an entire heredoc and not a false
          // positive (auto-detect, etc.)
          begin: regex.concat(/<<[-~]?'?/, regex.lookahead(/(\w+)(?=\W)[^\n]*\n(?:[^\n]*\n)*?\s*\1\b/)),
          contains: [hljs.END_SAME_AS_BEGIN({
            begin: /(\w+)/,
            end: /(\w+)/,
            contains: [hljs.BACKSLASH_ESCAPE, SUBST]
          })]
        }]
      };

      // Ruby syntax is underdocumented, but this grammar seems to be accurate
      // as of version 2.7.2 (confirmed with (irb and `Ripper.sexp(...)`)
      // https://docs.ruby-lang.org/en/2.7.0/doc/syntax/literals_rdoc.html#label-Numbers
      const decimal = '[1-9](_?[0-9])*|0';
      const digits = '[0-9](_?[0-9])*';
      const NUMBER = {
        className: 'number',
        relevance: 0,
        variants: [
        // decimal integer/float, optionally exponential or rational, optionally imaginary
        {
          begin: `\\b(${decimal})(\\.(${digits}))?([eE][+-]?(${digits})|r)?i?\\b`
        },
        // explicit decimal/binary/octal/hexadecimal integer,
        // optionally rational and/or imaginary
        {
          begin: "\\b0[dD][0-9](_?[0-9])*r?i?\\b"
        }, {
          begin: "\\b0[bB][0-1](_?[0-1])*r?i?\\b"
        }, {
          begin: "\\b0[oO][0-7](_?[0-7])*r?i?\\b"
        }, {
          begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*r?i?\\b"
        },
        // 0-prefixed implicit octal integer, optionally rational and/or imaginary
        {
          begin: "\\b0(_?[0-7])+r?i?\\b"
        }]
      };
      const PARAMS = {
        variants: [{
          match: /\(\)/
        }, {
          className: 'params',
          begin: /\(/,
          end: /(?=\))/,
          excludeBegin: true,
          endsParent: true,
          keywords: RUBY_KEYWORDS
        }]
      };
      const INCLUDE_EXTEND = {
        match: [/(include|extend)\s+/, CLASS_NAME_WITH_NAMESPACE_RE],
        scope: {
          2: "title.class"
        },
        keywords: RUBY_KEYWORDS
      };
      const CLASS_DEFINITION = {
        variants: [{
          match: [/class\s+/, CLASS_NAME_WITH_NAMESPACE_RE, /\s+<\s+/, CLASS_NAME_WITH_NAMESPACE_RE]
        }, {
          match: [/\b(class|module)\s+/, CLASS_NAME_WITH_NAMESPACE_RE]
        }],
        scope: {
          2: "title.class",
          4: "title.class.inherited"
        },
        keywords: RUBY_KEYWORDS
      };
      const UPPER_CASE_CONSTANT = {
        relevance: 0,
        match: /\b[A-Z][A-Z_0-9]+\b/,
        className: "variable.constant"
      };
      const METHOD_DEFINITION = {
        match: [/def/, /\s+/, RUBY_METHOD_RE],
        scope: {
          1: "keyword",
          3: "title.function"
        },
        contains: [PARAMS]
      };
      const OBJECT_CREATION = {
        relevance: 0,
        match: [CLASS_NAME_WITH_NAMESPACE_RE, /\.new[. (]/],
        scope: {
          1: "title.class"
        }
      };

      // CamelCase
      const CLASS_REFERENCE = {
        relevance: 0,
        match: CLASS_NAME_RE,
        scope: "title.class"
      };
      const RUBY_DEFAULT_CONTAINS = [STRING, CLASS_DEFINITION, INCLUDE_EXTEND, OBJECT_CREATION, UPPER_CASE_CONSTANT, CLASS_REFERENCE, METHOD_DEFINITION, {
        // swallow namespace qualifiers before symbols
        begin: hljs.IDENT_RE + '::'
      }, {
        className: 'symbol',
        begin: hljs.UNDERSCORE_IDENT_RE + '(!|\\?)?:',
        relevance: 0
      }, {
        className: 'symbol',
        begin: ':(?!\\s)',
        contains: [STRING, {
          begin: RUBY_METHOD_RE
        }],
        relevance: 0
      }, NUMBER, {
        // negative-look forward attempts to prevent false matches like:
        // @ident@ or $ident$ that might indicate this is not ruby at all
        className: "variable",
        begin: '(\\$\\W)|((\\$|@@?)(\\w+))(?=[^@$?])' + `(?![A-Za-z])(?![@$?'])`
      }, {
        className: 'params',
        begin: /\|/,
        end: /\|/,
        excludeBegin: true,
        excludeEnd: true,
        relevance: 0,
        // this could be a lot of things (in other languages) other than params
        keywords: RUBY_KEYWORDS
      }, {
        // regexp container
        begin: '(' + hljs.RE_STARTERS_RE + '|unless)\\s*',
        keywords: 'unless',
        contains: [{
          className: 'regexp',
          contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          illegal: /\n/,
          variants: [{
            begin: '/',
            end: '/[a-z]*'
          }, {
            begin: /%r\{/,
            end: /\}[a-z]*/
          }, {
            begin: '%r\\(',
            end: '\\)[a-z]*'
          }, {
            begin: '%r!',
            end: '![a-z]*'
          }, {
            begin: '%r\\[',
            end: '\\][a-z]*'
          }]
        }].concat(IRB_OBJECT, COMMENT_MODES),
        relevance: 0
      }].concat(IRB_OBJECT, COMMENT_MODES);
      SUBST.contains = RUBY_DEFAULT_CONTAINS;
      PARAMS.contains = RUBY_DEFAULT_CONTAINS;

      // >>
      // ?>
      const SIMPLE_PROMPT = "[>?]>";
      // irb(main):001:0>
      const DEFAULT_PROMPT = "[\\w#]+\\(\\w+\\):\\d+:\\d+[>*]";
      const RVM_PROMPT = "(\\w+-)?\\d+\\.\\d+\\.\\d+(p\\d+)?[^\\d][^>]+>";
      const IRB_DEFAULT = [{
        begin: /^\s*=>/,
        starts: {
          end: '$',
          contains: RUBY_DEFAULT_CONTAINS
        }
      }, {
        className: 'meta.prompt',
        begin: '^(' + SIMPLE_PROMPT + "|" + DEFAULT_PROMPT + '|' + RVM_PROMPT + ')(?=[ ])',
        starts: {
          end: '$',
          keywords: RUBY_KEYWORDS,
          contains: RUBY_DEFAULT_CONTAINS
        }
      }];
      COMMENT_MODES.unshift(IRB_OBJECT);
      return {
        name: 'Ruby',
        aliases: ['rb', 'gemspec', 'podspec', 'thor', 'irb'],
        keywords: RUBY_KEYWORDS,
        illegal: /\/\*/,
        contains: [hljs.SHEBANG({
          binary: "ruby"
        })].concat(IRB_DEFAULT).concat(COMMENT_MODES).concat(RUBY_DEFAULT_CONTAINS)
      };
    }
    ruby_1 = ruby;
    return ruby_1;
  }

  /*
  Language: Go
  Author: Stephan Kountso aka StepLg <steplg@gmail.com>
  Contributors: Evgeny Stepanischev <imbolk@gmail.com>
  Description: Google go language (golang). For info about language
  Website: http://golang.org/
  Category: common, system
  */
  var go_1;
  var hasRequiredGo;
  function requireGo() {
    if (hasRequiredGo) return go_1;
    hasRequiredGo = 1;
    function go(hljs) {
      const LITERALS = ["true", "false", "iota", "nil"];
      const BUILT_INS = ["append", "cap", "close", "complex", "copy", "imag", "len", "make", "new", "panic", "print", "println", "real", "recover", "delete"];
      const TYPES = ["bool", "byte", "complex64", "complex128", "error", "float32", "float64", "int8", "int16", "int32", "int64", "string", "uint8", "uint16", "uint32", "uint64", "int", "uint", "uintptr", "rune"];
      const KWS = ["break", "case", "chan", "const", "continue", "default", "defer", "else", "fallthrough", "for", "func", "go", "goto", "if", "import", "interface", "map", "package", "range", "return", "select", "struct", "switch", "type", "var"];
      const KEYWORDS = {
        keyword: KWS,
        type: TYPES,
        literal: LITERALS,
        built_in: BUILT_INS
      };
      return {
        name: 'Go',
        aliases: ['golang'],
        keywords: KEYWORDS,
        illegal: '</',
        contains: [hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, {
          className: 'string',
          variants: [hljs.QUOTE_STRING_MODE, hljs.APOS_STRING_MODE, {
            begin: '`',
            end: '`'
          }]
        }, {
          className: 'number',
          variants: [{
            begin: hljs.C_NUMBER_RE + '[i]',
            relevance: 1
          }, hljs.C_NUMBER_MODE]
        }, {
          begin: /:=/ // relevance booster
        }, {
          className: 'function',
          beginKeywords: 'func',
          end: '\\s*(\\{|$)',
          excludeEnd: true,
          contains: [hljs.TITLE_MODE, {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            endsParent: true,
            keywords: KEYWORDS,
            illegal: /["']/
          }]
        }]
      };
    }
    go_1 = go;
    return go_1;
  }

  /*
   Language: GraphQL
   Author: John Foster (GH jf990), and others
   Description: GraphQL is a query language for APIs
   Category: web, common
  */
  var graphql_1;
  var hasRequiredGraphql;
  function requireGraphql() {
    if (hasRequiredGraphql) return graphql_1;
    hasRequiredGraphql = 1;
    /** @type LanguageFn */
    function graphql(hljs) {
      const regex = hljs.regex;
      const GQL_NAME = /[_A-Za-z][_0-9A-Za-z]*/;
      return {
        name: "GraphQL",
        aliases: ["gql"],
        case_insensitive: true,
        disableAutodetect: false,
        keywords: {
          keyword: ["query", "mutation", "subscription", "type", "input", "schema", "directive", "interface", "union", "scalar", "fragment", "enum", "on"],
          literal: ["true", "false", "null"]
        },
        contains: [hljs.HASH_COMMENT_MODE, hljs.QUOTE_STRING_MODE, hljs.NUMBER_MODE, {
          scope: "punctuation",
          match: /[.]{3}/,
          relevance: 0
        }, {
          scope: "punctuation",
          begin: /[\!\(\)\:\=\[\]\{\|\}]{1}/,
          relevance: 0
        }, {
          scope: "variable",
          begin: /\$/,
          end: /\W/,
          excludeEnd: true,
          relevance: 0
        }, {
          scope: "meta",
          match: /@\w+/,
          excludeEnd: true
        }, {
          scope: "symbol",
          begin: regex.concat(GQL_NAME, regex.lookahead(/\s*:/)),
          relevance: 0
        }],
        illegal: [/[;<']/, /BEGIN/]
      };
    }
    graphql_1 = graphql;
    return graphql_1;
  }

  /*
  Language: TOML, also INI
  Description: TOML aims to be a minimal configuration file format that's easy to read due to obvious semantics.
  Contributors: Guillaume Gomez <guillaume1.gomez@gmail.com>
  Category: common, config
  Website: https://github.com/toml-lang/toml
  */
  var ini_1;
  var hasRequiredIni;
  function requireIni() {
    if (hasRequiredIni) return ini_1;
    hasRequiredIni = 1;
    function ini(hljs) {
      const regex = hljs.regex;
      const NUMBERS = {
        className: 'number',
        relevance: 0,
        variants: [{
          begin: /([+-]+)?[\d]+_[\d_]+/
        }, {
          begin: hljs.NUMBER_RE
        }]
      };
      const COMMENTS = hljs.COMMENT();
      COMMENTS.variants = [{
        begin: /;/,
        end: /$/
      }, {
        begin: /#/,
        end: /$/
      }];
      const VARIABLES = {
        className: 'variable',
        variants: [{
          begin: /\$[\w\d"][\w\d_]*/
        }, {
          begin: /\$\{(.*?)\}/
        }]
      };
      const LITERALS = {
        className: 'literal',
        begin: /\bon|off|true|false|yes|no\b/
      };
      const STRINGS = {
        className: "string",
        contains: [hljs.BACKSLASH_ESCAPE],
        variants: [{
          begin: "'''",
          end: "'''",
          relevance: 10
        }, {
          begin: '"""',
          end: '"""',
          relevance: 10
        }, {
          begin: '"',
          end: '"'
        }, {
          begin: "'",
          end: "'"
        }]
      };
      const ARRAY = {
        begin: /\[/,
        end: /\]/,
        contains: [COMMENTS, LITERALS, VARIABLES, STRINGS, NUMBERS, 'self'],
        relevance: 0
      };
      const BARE_KEY = /[A-Za-z0-9_-]+/;
      const QUOTED_KEY_DOUBLE_QUOTE = /"(\\"|[^"])*"/;
      const QUOTED_KEY_SINGLE_QUOTE = /'[^']*'/;
      const ANY_KEY = regex.either(BARE_KEY, QUOTED_KEY_DOUBLE_QUOTE, QUOTED_KEY_SINGLE_QUOTE);
      const DOTTED_KEY = regex.concat(ANY_KEY, '(\\s*\\.\\s*', ANY_KEY, ')*', regex.lookahead(/\s*=\s*[^#\s]/));
      return {
        name: 'TOML, also INI',
        aliases: ['toml'],
        case_insensitive: true,
        illegal: /\S/,
        contains: [COMMENTS, {
          className: 'section',
          begin: /\[+/,
          end: /\]+/
        }, {
          begin: DOTTED_KEY,
          className: 'attr',
          starts: {
            end: /$/,
            contains: [COMMENTS, ARRAY, LITERALS, VARIABLES, STRINGS, NUMBERS]
          }
        }]
      };
    }
    ini_1 = ini;
    return ini_1;
  }

  var java_1;
  var hasRequiredJava;
  function requireJava() {
    if (hasRequiredJava) return java_1;
    hasRequiredJava = 1;
    // https://docs.oracle.com/javase/specs/jls/se15/html/jls-3.html#jls-3.10
    var decimalDigits = '[0-9](_*[0-9])*';
    var frac = `\\.(${decimalDigits})`;
    var hexDigits = '[0-9a-fA-F](_*[0-9a-fA-F])*';
    var NUMERIC = {
      className: 'number',
      variants: [
      // DecimalFloatingPointLiteral
      // including ExponentPart
      {
        begin: `(\\b(${decimalDigits})((${frac})|\\.)?|(${frac}))` + `[eE][+-]?(${decimalDigits})[fFdD]?\\b`
      },
      // excluding ExponentPart
      {
        begin: `\\b(${decimalDigits})((${frac})[fFdD]?\\b|\\.([fFdD]\\b)?)`
      }, {
        begin: `(${frac})[fFdD]?\\b`
      }, {
        begin: `\\b(${decimalDigits})[fFdD]\\b`
      },
      // HexadecimalFloatingPointLiteral
      {
        begin: `\\b0[xX]((${hexDigits})\\.?|(${hexDigits})?\\.(${hexDigits}))` + `[pP][+-]?(${decimalDigits})[fFdD]?\\b`
      },
      // DecimalIntegerLiteral
      {
        begin: '\\b(0|[1-9](_*[0-9])*)[lL]?\\b'
      },
      // HexIntegerLiteral
      {
        begin: `\\b0[xX](${hexDigits})[lL]?\\b`
      },
      // OctalIntegerLiteral
      {
        begin: '\\b0(_*[0-7])*[lL]?\\b'
      },
      // BinaryIntegerLiteral
      {
        begin: '\\b0[bB][01](_*[01])*[lL]?\\b'
      }],
      relevance: 0
    };

    /*
    Language: Java
    Author: Vsevolod Solovyov <vsevolod.solovyov@gmail.com>
    Category: common, enterprise
    Website: https://www.java.com/
    */

    /**
     * Allows recursive regex expressions to a given depth
     *
     * ie: recurRegex("(abc~~~)", /~~~/g, 2) becomes:
     * (abc(abc(abc)))
     *
     * @param {string} re
     * @param {RegExp} substitution (should be a g mode regex)
     * @param {number} depth
     * @returns {string}``
     */
    function recurRegex(re, substitution, depth) {
      if (depth === -1) return "";
      return re.replace(substitution, _ => {
        return recurRegex(re, substitution, depth - 1);
      });
    }

    /** @type LanguageFn */
    function java(hljs) {
      const regex = hljs.regex;
      const JAVA_IDENT_RE = '[\u00C0-\u02B8a-zA-Z_$][\u00C0-\u02B8a-zA-Z_$0-9]*';
      const GENERIC_IDENT_RE = JAVA_IDENT_RE + recurRegex('(?:<' + JAVA_IDENT_RE + '~~~(?:\\s*,\\s*' + JAVA_IDENT_RE + '~~~)*>)?', /~~~/g, 2);
      const MAIN_KEYWORDS = ['synchronized', 'abstract', 'private', 'var', 'static', 'if', 'const ', 'for', 'while', 'strictfp', 'finally', 'protected', 'import', 'native', 'final', 'void', 'enum', 'else', 'break', 'transient', 'catch', 'instanceof', 'volatile', 'case', 'assert', 'package', 'default', 'public', 'try', 'switch', 'continue', 'throws', 'protected', 'public', 'private', 'module', 'requires', 'exports', 'do', 'sealed', 'yield', 'permits'];
      const BUILT_INS = ['super', 'this'];
      const LITERALS = ['false', 'true', 'null'];
      const TYPES = ['char', 'boolean', 'long', 'float', 'int', 'byte', 'short', 'double'];
      const KEYWORDS = {
        keyword: MAIN_KEYWORDS,
        literal: LITERALS,
        type: TYPES,
        built_in: BUILT_INS
      };
      const ANNOTATION = {
        className: 'meta',
        begin: '@' + JAVA_IDENT_RE,
        contains: [{
          begin: /\(/,
          end: /\)/,
          contains: ["self"] // allow nested () inside our annotation
        }]
      };

      const PARAMS = {
        className: 'params',
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS,
        relevance: 0,
        contains: [hljs.C_BLOCK_COMMENT_MODE],
        endsParent: true
      };
      return {
        name: 'Java',
        aliases: ['jsp'],
        keywords: KEYWORDS,
        illegal: /<\/|#/,
        contains: [hljs.COMMENT('/\\*\\*', '\\*/', {
          relevance: 0,
          contains: [{
            // eat up @'s in emails to prevent them to be recognized as doctags
            begin: /\w+@/,
            relevance: 0
          }, {
            className: 'doctag',
            begin: '@[A-Za-z]+'
          }]
        }),
        // relevance boost
        {
          begin: /import java\.[a-z]+\./,
          keywords: "import",
          relevance: 2
        }, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, {
          begin: /"""/,
          end: /"""/,
          className: "string",
          contains: [hljs.BACKSLASH_ESCAPE]
        }, hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE, {
          match: [/\b(?:class|interface|enum|extends|implements|new)/, /\s+/, JAVA_IDENT_RE],
          className: {
            1: "keyword",
            3: "title.class"
          }
        }, {
          // Exceptions for hyphenated keywords
          match: /non-sealed/,
          scope: "keyword"
        }, {
          begin: [regex.concat(/(?!else)/, JAVA_IDENT_RE), /\s+/, JAVA_IDENT_RE, /\s+/, /=(?!=)/],
          className: {
            1: "type",
            3: "variable",
            5: "operator"
          }
        }, {
          begin: [/record/, /\s+/, JAVA_IDENT_RE],
          className: {
            1: "keyword",
            3: "title.class"
          },
          contains: [PARAMS, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE]
        }, {
          // Expression keywords prevent 'keyword Name(...)' from being
          // recognized as a function definition
          beginKeywords: 'new throw return else',
          relevance: 0
        }, {
          begin: ['(?:' + GENERIC_IDENT_RE + '\\s+)', hljs.UNDERSCORE_IDENT_RE, /\s*(?=\()/],
          className: {
            2: "title.function"
          },
          keywords: KEYWORDS,
          contains: [{
            className: 'params',
            begin: /\(/,
            end: /\)/,
            keywords: KEYWORDS,
            relevance: 0,
            contains: [ANNOTATION, hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE, NUMERIC, hljs.C_BLOCK_COMMENT_MODE]
          }, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE]
        }, NUMERIC, ANNOTATION]
      };
    }
    java_1 = java;
    return java_1;
  }

  var javascript_1;
  var hasRequiredJavascript;
  function requireJavascript() {
    if (hasRequiredJavascript) return javascript_1;
    hasRequiredJavascript = 1;
    const IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
    const KEYWORDS = ["as",
    // for exports
    "in", "of", "if", "for", "while", "finally", "var", "new", "function", "do", "return", "void", "else", "break", "catch", "instanceof", "with", "throw", "case", "default", "try", "switch", "continue", "typeof", "delete", "let", "yield", "const", "class",
    // JS handles these with a special rule
    // "get",
    // "set",
    "debugger", "async", "await", "static", "import", "from", "export", "extends"];
    const LITERALS = ["true", "false", "null", "undefined", "NaN", "Infinity"];

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
    const TYPES = [
    // Fundamental objects
    "Object", "Function", "Boolean", "Symbol",
    // numbers and dates
    "Math", "Date", "Number", "BigInt",
    // text
    "String", "RegExp",
    // Indexed collections
    "Array", "Float32Array", "Float64Array", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Int32Array", "Uint16Array", "Uint32Array", "BigInt64Array", "BigUint64Array",
    // Keyed collections
    "Set", "Map", "WeakSet", "WeakMap",
    // Structured data
    "ArrayBuffer", "SharedArrayBuffer", "Atomics", "DataView", "JSON",
    // Control abstraction objects
    "Promise", "Generator", "GeneratorFunction", "AsyncFunction",
    // Reflection
    "Reflect", "Proxy",
    // Internationalization
    "Intl",
    // WebAssembly
    "WebAssembly"];
    const ERROR_TYPES = ["Error", "EvalError", "InternalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"];
    const BUILT_IN_GLOBALS = ["setInterval", "setTimeout", "clearInterval", "clearTimeout", "require", "exports", "eval", "isFinite", "isNaN", "parseFloat", "parseInt", "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent", "escape", "unescape"];
    const BUILT_IN_VARIABLES = ["arguments", "this", "super", "console", "window", "document", "localStorage", "sessionStorage", "module", "global" // Node.js
    ];

    const BUILT_INS = [].concat(BUILT_IN_GLOBALS, TYPES, ERROR_TYPES);

    /*
    Language: JavaScript
    Description: JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.
    Category: common, scripting, web
    Website: https://developer.mozilla.org/en-US/docs/Web/JavaScript
    */

    /** @type LanguageFn */
    function javascript(hljs) {
      const regex = hljs.regex;
      /**
       * Takes a string like "<Booger" and checks to see
       * if we can find a matching "</Booger" later in the
       * content.
       * @param {RegExpMatchArray} match
       * @param {{after:number}} param1
       */
      const hasClosingTag = (match, {
        after
      }) => {
        const tag = "</" + match[0].slice(1);
        const pos = match.input.indexOf(tag, after);
        return pos !== -1;
      };
      const IDENT_RE$1 = IDENT_RE;
      const FRAGMENT = {
        begin: '<>',
        end: '</>'
      };
      // to avoid some special cases inside isTrulyOpeningTag
      const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
      const XML_TAG = {
        begin: /<[A-Za-z0-9\\._:-]+/,
        end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
        /**
         * @param {RegExpMatchArray} match
         * @param {CallbackResponse} response
         */
        isTrulyOpeningTag: (match, response) => {
          const afterMatchIndex = match[0].length + match.index;
          const nextChar = match.input[afterMatchIndex];
          if (
          // HTML should not include another raw `<` inside a tag
          // nested type?
          // `<Array<Array<number>>`, etc.
          nextChar === "<" ||
          // the , gives away that this is not HTML
          // `<T, A extends keyof T, V>`
          nextChar === ",") {
            response.ignoreMatch();
            return;
          }

          // `<something>`
          // Quite possibly a tag, lets look for a matching closing tag...
          if (nextChar === ">") {
            // if we cannot find a matching closing tag, then we
            // will ignore it
            if (!hasClosingTag(match, {
              after: afterMatchIndex
            })) {
              response.ignoreMatch();
            }
          }

          // `<blah />` (self-closing)
          // handled by simpleSelfClosing rule

          let m;
          const afterMatch = match.input.substring(afterMatchIndex);

          // some more template typing stuff
          //  <T = any>(key?: string) => Modify<
          if (m = afterMatch.match(/^\s*=/)) {
            response.ignoreMatch();
            return;
          }

          // `<From extends string>`
          // technically this could be HTML, but it smells like a type
          // NOTE: This is ugh, but added specifically for https://github.com/highlightjs/highlight.js/issues/3276
          if (m = afterMatch.match(/^\s+extends\s+/)) {
            if (m.index === 0) {
              response.ignoreMatch();
              // eslint-disable-next-line no-useless-return
              return;
            }
          }
        }
      };
      const KEYWORDS$1 = {
        $pattern: IDENT_RE,
        keyword: KEYWORDS,
        literal: LITERALS,
        built_in: BUILT_INS,
        "variable.language": BUILT_IN_VARIABLES
      };

      // https://tc39.es/ecma262/#sec-literals-numeric-literals
      const decimalDigits = '[0-9](_?[0-9])*';
      const frac = `\\.(${decimalDigits})`;
      // DecimalIntegerLiteral, including Annex B NonOctalDecimalIntegerLiteral
      // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
      const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
      const NUMBER = {
        className: 'number',
        variants: [
        // DecimalLiteral
        {
          begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))` + `[eE][+-]?(${decimalDigits})\\b`
        }, {
          begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b`
        },
        // DecimalBigIntegerLiteral
        {
          begin: `\\b(0|[1-9](_?[0-9])*)n\\b`
        },
        // NonDecimalIntegerLiteral
        {
          begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b"
        }, {
          begin: "\\b0[bB][0-1](_?[0-1])*n?\\b"
        }, {
          begin: "\\b0[oO][0-7](_?[0-7])*n?\\b"
        },
        // LegacyOctalIntegerLiteral (does not include underscore separators)
        // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
        {
          begin: "\\b0[0-7]+n?\\b"
        }],
        relevance: 0
      };
      const SUBST = {
        className: 'subst',
        begin: '\\$\\{',
        end: '\\}',
        keywords: KEYWORDS$1,
        contains: [] // defined later
      };

      const HTML_TEMPLATE = {
        begin: 'html`',
        end: '',
        starts: {
          end: '`',
          returnEnd: false,
          contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          subLanguage: 'xml'
        }
      };
      const CSS_TEMPLATE = {
        begin: 'css`',
        end: '',
        starts: {
          end: '`',
          returnEnd: false,
          contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          subLanguage: 'css'
        }
      };
      const GRAPHQL_TEMPLATE = {
        begin: 'gql`',
        end: '',
        starts: {
          end: '`',
          returnEnd: false,
          contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          subLanguage: 'graphql'
        }
      };
      const TEMPLATE_STRING = {
        className: 'string',
        begin: '`',
        end: '`',
        contains: [hljs.BACKSLASH_ESCAPE, SUBST]
      };
      const JSDOC_COMMENT = hljs.COMMENT(/\/\*\*(?!\/)/, '\\*/', {
        relevance: 0,
        contains: [{
          begin: '(?=@[A-Za-z]+)',
          relevance: 0,
          contains: [{
            className: 'doctag',
            begin: '@[A-Za-z]+'
          }, {
            className: 'type',
            begin: '\\{',
            end: '\\}',
            excludeEnd: true,
            excludeBegin: true,
            relevance: 0
          }, {
            className: 'variable',
            begin: IDENT_RE$1 + '(?=\\s*(-)|$)',
            endsParent: true,
            relevance: 0
          },
          // eat spaces (not newlines) so we can find
          // types or variables
          {
            begin: /(?=[^\n])\s/,
            relevance: 0
          }]
        }]
      });
      const COMMENT = {
        className: "comment",
        variants: [JSDOC_COMMENT, hljs.C_BLOCK_COMMENT_MODE, hljs.C_LINE_COMMENT_MODE]
      };
      const SUBST_INTERNALS = [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE, HTML_TEMPLATE, CSS_TEMPLATE, GRAPHQL_TEMPLATE, TEMPLATE_STRING,
      // Skip numbers when they are part of a variable name
      {
        match: /\$\d+/
      }, NUMBER
      // This is intentional:
      // See https://github.com/highlightjs/highlight.js/issues/3288
      // hljs.REGEXP_MODE
      ];

      SUBST.contains = SUBST_INTERNALS.concat({
        // we need to pair up {} inside our subst to prevent
        // it from ending too early by matching another }
        begin: /\{/,
        end: /\}/,
        keywords: KEYWORDS$1,
        contains: ["self"].concat(SUBST_INTERNALS)
      });
      const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
      const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
      // eat recursive parens in sub expressions
      {
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS$1,
        contains: ["self"].concat(SUBST_AND_COMMENTS)
      }]);
      const PARAMS = {
        className: 'params',
        begin: /\(/,
        end: /\)/,
        excludeBegin: true,
        excludeEnd: true,
        keywords: KEYWORDS$1,
        contains: PARAMS_CONTAINS
      };

      // ES6 classes
      const CLASS_OR_EXTENDS = {
        variants: [
        // class Car extends vehicle
        {
          match: [/class/, /\s+/, IDENT_RE$1, /\s+/, /extends/, /\s+/, regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")],
          scope: {
            1: "keyword",
            3: "title.class",
            5: "keyword",
            7: "title.class.inherited"
          }
        },
        // class Car
        {
          match: [/class/, /\s+/, IDENT_RE$1],
          scope: {
            1: "keyword",
            3: "title.class"
          }
        }]
      };
      const CLASS_REFERENCE = {
        relevance: 0,
        match: regex.either(
        // Hard coded exceptions
        /\bJSON/,
        // Float32Array, OutT
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        // CSSFactory, CSSFactoryT
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        // FPs, FPsT
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/
        // P
        // single letters are not highlighted
        // BLAH
        // this will be flagged as a UPPER_CASE_CONSTANT instead
        ),

        className: "title.class",
        keywords: {
          _: [
          // se we still get relevance credit for JS library classes
          ...TYPES, ...ERROR_TYPES]
        }
      };
      const USE_STRICT = {
        label: "use_strict",
        className: 'meta',
        relevance: 10,
        begin: /^\s*['"]use (strict|asm)['"]/
      };
      const FUNCTION_DEFINITION = {
        variants: [{
          match: [/function/, /\s+/, IDENT_RE$1, /(?=\s*\()/]
        },
        // anonymous function
        {
          match: [/function/, /\s*(?=\()/]
        }],
        className: {
          1: "keyword",
          3: "title.function"
        },
        label: "func.def",
        contains: [PARAMS],
        illegal: /%/
      };
      const UPPER_CASE_CONSTANT = {
        relevance: 0,
        match: /\b[A-Z][A-Z_0-9]+\b/,
        className: "variable.constant"
      };
      function noneOf(list) {
        return regex.concat("(?!", list.join("|"), ")");
      }
      const FUNCTION_CALL = {
        match: regex.concat(/\b/, noneOf([...BUILT_IN_GLOBALS, "super", "import"]), IDENT_RE$1, regex.lookahead(/\(/)),
        className: "title.function",
        relevance: 0
      };
      const PROPERTY_ACCESS = {
        begin: regex.concat(/\./, regex.lookahead(regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/))),
        end: IDENT_RE$1,
        excludeBegin: true,
        keywords: "prototype",
        className: "property",
        relevance: 0
      };
      const GETTER_OR_SETTER = {
        match: [/get|set/, /\s+/, IDENT_RE$1, /(?=\()/],
        className: {
          1: "keyword",
          3: "title.function"
        },
        contains: [{
          // eat to avoid empty params
          begin: /\(\)/
        }, PARAMS]
      };
      const FUNC_LEAD_IN_RE = '(\\(' + '[^()]*(\\(' + '[^()]*(\\(' + '[^()]*' + '\\)[^()]*)*' + '\\)[^()]*)*' + '\\)|' + hljs.UNDERSCORE_IDENT_RE + ')\\s*=>';
      const FUNCTION_VARIABLE = {
        match: [/const|var|let/, /\s+/, IDENT_RE$1, /\s*/, /=\s*/, /(async\s*)?/,
        // async is optional
        regex.lookahead(FUNC_LEAD_IN_RE)],
        keywords: "async",
        className: {
          1: "keyword",
          3: "title.function"
        },
        contains: [PARAMS]
      };
      return {
        name: 'JavaScript',
        aliases: ['js', 'jsx', 'mjs', 'cjs'],
        keywords: KEYWORDS$1,
        // this will be extended by TypeScript
        exports: {
          PARAMS_CONTAINS,
          CLASS_REFERENCE
        },
        illegal: /#(?![$_A-z])/,
        contains: [hljs.SHEBANG({
          label: "shebang",
          binary: "node",
          relevance: 5
        }), USE_STRICT, hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE, HTML_TEMPLATE, CSS_TEMPLATE, GRAPHQL_TEMPLATE, TEMPLATE_STRING, COMMENT,
        // Skip numbers when they are part of a variable name
        {
          match: /\$\d+/
        }, NUMBER, CLASS_REFERENCE, {
          className: 'attr',
          begin: IDENT_RE$1 + regex.lookahead(':'),
          relevance: 0
        }, FUNCTION_VARIABLE, {
          // "value" container
          begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
          keywords: 'return throw case',
          relevance: 0,
          contains: [COMMENT, hljs.REGEXP_MODE, {
            className: 'function',
            // we have to count the parens to make sure we actually have the
            // correct bounding ( ) before the =>.  There could be any number of
            // sub-expressions inside also surrounded by parens.
            begin: FUNC_LEAD_IN_RE,
            returnBegin: true,
            end: '\\s*=>',
            contains: [{
              className: 'params',
              variants: [{
                begin: hljs.UNDERSCORE_IDENT_RE,
                relevance: 0
              }, {
                className: null,
                begin: /\(\s*\)/,
                skip: true
              }, {
                begin: /\(/,
                end: /\)/,
                excludeBegin: true,
                excludeEnd: true,
                keywords: KEYWORDS$1,
                contains: PARAMS_CONTAINS
              }]
            }]
          }, {
            // could be a comma delimited list of params to a function call
            begin: /,/,
            relevance: 0
          }, {
            match: /\s+/,
            relevance: 0
          }, {
            // JSX
            variants: [{
              begin: FRAGMENT.begin,
              end: FRAGMENT.end
            }, {
              match: XML_SELF_CLOSING
            }, {
              begin: XML_TAG.begin,
              // we carefully check the opening tag to see if it truly
              // is a tag and not a false positive
              'on:begin': XML_TAG.isTrulyOpeningTag,
              end: XML_TAG.end
            }],
            subLanguage: 'xml',
            contains: [{
              begin: XML_TAG.begin,
              end: XML_TAG.end,
              skip: true,
              contains: ['self']
            }]
          }]
        }, FUNCTION_DEFINITION, {
          // prevent this from getting swallowed up by function
          // since they appear "function like"
          beginKeywords: "while if switch catch for"
        }, {
          // we have to count the parens to make sure we actually have the correct
          // bounding ( ).  There could be any number of sub-expressions inside
          // also surrounded by parens.
          begin: '\\b(?!function)' + hljs.UNDERSCORE_IDENT_RE + '\\(' +
          // first parens
          '[^()]*(\\(' + '[^()]*(\\(' + '[^()]*' + '\\)[^()]*)*' + '\\)[^()]*)*' + '\\)\\s*\\{',
          // end parens
          returnBegin: true,
          label: "func.def",
          contains: [PARAMS, hljs.inherit(hljs.TITLE_MODE, {
            begin: IDENT_RE$1,
            className: "title.function"
          })]
        },
        // catch ... so it won't trigger the property rule below
        {
          match: /\.\.\./,
          relevance: 0
        }, PROPERTY_ACCESS,
        // hack: prevents detection of keywords in some circumstances
        // .keyword()
        // $keyword = x
        {
          match: '\\$' + IDENT_RE$1,
          relevance: 0
        }, {
          match: [/\bconstructor(?=\s*\()/],
          className: {
            1: "title.function"
          },
          contains: [PARAMS]
        }, FUNCTION_CALL, UPPER_CASE_CONSTANT, CLASS_OR_EXTENDS, GETTER_OR_SETTER, {
          match: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
        }]
      };
    }

    javascript_1 = javascript;
    return javascript_1;
  }

  /*
  Language: JSON
  Description: JSON (JavaScript Object Notation) is a lightweight data-interchange format.
  Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Website: http://www.json.org
  Category: common, protocols, web
  */
  var json_1;
  var hasRequiredJson;
  function requireJson() {
    if (hasRequiredJson) return json_1;
    hasRequiredJson = 1;
    function json(hljs) {
      const ATTRIBUTE = {
        className: 'attr',
        begin: /"(\\.|[^\\"\r\n])*"(?=\s*:)/,
        relevance: 1.01
      };
      const PUNCTUATION = {
        match: /[{}[\],:]/,
        className: "punctuation",
        relevance: 0
      };
      const LITERALS = ["true", "false", "null"];
      // NOTE: normally we would rely on `keywords` for this but using a mode here allows us
      // - to use the very tight `illegal: \S` rule later to flag any other character
      // - as illegal indicating that despite looking like JSON we do not truly have
      // - JSON and thus improve false-positively greatly since JSON will try and claim
      // - all sorts of JSON looking stuff
      const LITERALS_MODE = {
        scope: "literal",
        beginKeywords: LITERALS.join(" ")
      };
      return {
        name: 'JSON',
        keywords: {
          literal: LITERALS
        },
        contains: [ATTRIBUTE, PUNCTUATION, hljs.QUOTE_STRING_MODE, LITERALS_MODE, hljs.C_NUMBER_MODE, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE],
        illegal: '\\S'
      };
    }
    json_1 = json;
    return json_1;
  }

  var kotlin_1;
  var hasRequiredKotlin;
  function requireKotlin() {
    if (hasRequiredKotlin) return kotlin_1;
    hasRequiredKotlin = 1;
    // https://docs.oracle.com/javase/specs/jls/se15/html/jls-3.html#jls-3.10
    var decimalDigits = '[0-9](_*[0-9])*';
    var frac = `\\.(${decimalDigits})`;
    var hexDigits = '[0-9a-fA-F](_*[0-9a-fA-F])*';
    var NUMERIC = {
      className: 'number',
      variants: [
      // DecimalFloatingPointLiteral
      // including ExponentPart
      {
        begin: `(\\b(${decimalDigits})((${frac})|\\.)?|(${frac}))` + `[eE][+-]?(${decimalDigits})[fFdD]?\\b`
      },
      // excluding ExponentPart
      {
        begin: `\\b(${decimalDigits})((${frac})[fFdD]?\\b|\\.([fFdD]\\b)?)`
      }, {
        begin: `(${frac})[fFdD]?\\b`
      }, {
        begin: `\\b(${decimalDigits})[fFdD]\\b`
      },
      // HexadecimalFloatingPointLiteral
      {
        begin: `\\b0[xX]((${hexDigits})\\.?|(${hexDigits})?\\.(${hexDigits}))` + `[pP][+-]?(${decimalDigits})[fFdD]?\\b`
      },
      // DecimalIntegerLiteral
      {
        begin: '\\b(0|[1-9](_*[0-9])*)[lL]?\\b'
      },
      // HexIntegerLiteral
      {
        begin: `\\b0[xX](${hexDigits})[lL]?\\b`
      },
      // OctalIntegerLiteral
      {
        begin: '\\b0(_*[0-7])*[lL]?\\b'
      },
      // BinaryIntegerLiteral
      {
        begin: '\\b0[bB][01](_*[01])*[lL]?\\b'
      }],
      relevance: 0
    };

    /*
     Language: Kotlin
     Description: Kotlin is an OSS statically typed programming language that targets the JVM, Android, JavaScript and Native.
     Author: Sergey Mashkov <cy6erGn0m@gmail.com>
     Website: https://kotlinlang.org
     Category: common
     */

    function kotlin(hljs) {
      const KEYWORDS = {
        keyword: 'abstract as val var vararg get set class object open private protected public noinline ' + 'crossinline dynamic final enum if else do while for when throw try catch finally ' + 'import package is in fun override companion reified inline lateinit init ' + 'interface annotation data sealed internal infix operator out by constructor super ' + 'tailrec where const inner suspend typealias external expect actual',
        built_in: 'Byte Short Char Int Long Boolean Float Double Void Unit Nothing',
        literal: 'true false null'
      };
      const KEYWORDS_WITH_LABEL = {
        className: 'keyword',
        begin: /\b(break|continue|return|this)\b/,
        starts: {
          contains: [{
            className: 'symbol',
            begin: /@\w+/
          }]
        }
      };
      const LABEL = {
        className: 'symbol',
        begin: hljs.UNDERSCORE_IDENT_RE + '@'
      };

      // for string templates
      const SUBST = {
        className: 'subst',
        begin: /\$\{/,
        end: /\}/,
        contains: [hljs.C_NUMBER_MODE]
      };
      const VARIABLE = {
        className: 'variable',
        begin: '\\$' + hljs.UNDERSCORE_IDENT_RE
      };
      const STRING = {
        className: 'string',
        variants: [{
          begin: '"""',
          end: '"""(?=[^"])',
          contains: [VARIABLE, SUBST]
        },
        // Can't use built-in modes easily, as we want to use STRING in the meta
        // context as 'meta-string' and there's no syntax to remove explicitly set
        // classNames in built-in modes.
        {
          begin: '\'',
          end: '\'',
          illegal: /\n/,
          contains: [hljs.BACKSLASH_ESCAPE]
        }, {
          begin: '"',
          end: '"',
          illegal: /\n/,
          contains: [hljs.BACKSLASH_ESCAPE, VARIABLE, SUBST]
        }]
      };
      SUBST.contains.push(STRING);
      const ANNOTATION_USE_SITE = {
        className: 'meta',
        begin: '@(?:file|property|field|get|set|receiver|param|setparam|delegate)\\s*:(?:\\s*' + hljs.UNDERSCORE_IDENT_RE + ')?'
      };
      const ANNOTATION = {
        className: 'meta',
        begin: '@' + hljs.UNDERSCORE_IDENT_RE,
        contains: [{
          begin: /\(/,
          end: /\)/,
          contains: [hljs.inherit(STRING, {
            className: 'string'
          }), "self"]
        }]
      };

      // https://kotlinlang.org/docs/reference/whatsnew11.html#underscores-in-numeric-literals
      // According to the doc above, the number mode of kotlin is the same as java 8,
      // so the code below is copied from java.js
      const KOTLIN_NUMBER_MODE = NUMERIC;
      const KOTLIN_NESTED_COMMENT = hljs.COMMENT('/\\*', '\\*/', {
        contains: [hljs.C_BLOCK_COMMENT_MODE]
      });
      const KOTLIN_PAREN_TYPE = {
        variants: [{
          className: 'type',
          begin: hljs.UNDERSCORE_IDENT_RE
        }, {
          begin: /\(/,
          end: /\)/,
          contains: [] // defined later
        }]
      };

      const KOTLIN_PAREN_TYPE2 = KOTLIN_PAREN_TYPE;
      KOTLIN_PAREN_TYPE2.variants[1].contains = [KOTLIN_PAREN_TYPE];
      KOTLIN_PAREN_TYPE.variants[1].contains = [KOTLIN_PAREN_TYPE2];
      return {
        name: 'Kotlin',
        aliases: ['kt', 'kts'],
        keywords: KEYWORDS,
        contains: [hljs.COMMENT('/\\*\\*', '\\*/', {
          relevance: 0,
          contains: [{
            className: 'doctag',
            begin: '@[A-Za-z]+'
          }]
        }), hljs.C_LINE_COMMENT_MODE, KOTLIN_NESTED_COMMENT, KEYWORDS_WITH_LABEL, LABEL, ANNOTATION_USE_SITE, ANNOTATION, {
          className: 'function',
          beginKeywords: 'fun',
          end: '[(]|$',
          returnBegin: true,
          excludeEnd: true,
          keywords: KEYWORDS,
          relevance: 5,
          contains: [{
            begin: hljs.UNDERSCORE_IDENT_RE + '\\s*\\(',
            returnBegin: true,
            relevance: 0,
            contains: [hljs.UNDERSCORE_TITLE_MODE]
          }, {
            className: 'type',
            begin: /</,
            end: />/,
            keywords: 'reified',
            relevance: 0
          }, {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            endsParent: true,
            keywords: KEYWORDS,
            relevance: 0,
            contains: [{
              begin: /:/,
              end: /[=,\/]/,
              endsWithParent: true,
              contains: [KOTLIN_PAREN_TYPE, hljs.C_LINE_COMMENT_MODE, KOTLIN_NESTED_COMMENT],
              relevance: 0
            }, hljs.C_LINE_COMMENT_MODE, KOTLIN_NESTED_COMMENT, ANNOTATION_USE_SITE, ANNOTATION, STRING, hljs.C_NUMBER_MODE]
          }, KOTLIN_NESTED_COMMENT]
        }, {
          begin: [/class|interface|trait/, /\s+/, hljs.UNDERSCORE_IDENT_RE],
          beginScope: {
            3: "title.class"
          },
          keywords: 'class interface trait',
          end: /[:\{(]|$/,
          excludeEnd: true,
          illegal: 'extends implements',
          contains: [{
            beginKeywords: 'public protected internal private constructor'
          }, hljs.UNDERSCORE_TITLE_MODE, {
            className: 'type',
            begin: /</,
            end: />/,
            excludeBegin: true,
            excludeEnd: true,
            relevance: 0
          }, {
            className: 'type',
            begin: /[,:]\s*/,
            end: /[<\(,){\s]|$/,
            excludeBegin: true,
            returnEnd: true
          }, ANNOTATION_USE_SITE, ANNOTATION]
        }, STRING, {
          className: 'meta',
          begin: "^#!/usr/bin/.env",
          end: '$',
          illegal: '\n'
        }, KOTLIN_NUMBER_MODE]
      };
    }
    kotlin_1 = kotlin;
    return kotlin_1;
  }

  var less_1;
  var hasRequiredLess;
  function requireLess() {
    if (hasRequiredLess) return less_1;
    hasRequiredLess = 1;
    const MODES = hljs => {
      return {
        IMPORTANT: {
          scope: 'meta',
          begin: '!important'
        },
        BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
        HEXCOLOR: {
          scope: 'number',
          begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
        },
        FUNCTION_DISPATCH: {
          className: "built_in",
          begin: /[\w-]+(?=\()/
        },
        ATTRIBUTE_SELECTOR_MODE: {
          scope: 'selector-attr',
          begin: /\[/,
          end: /\]/,
          illegal: '$',
          contains: [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE]
        },
        CSS_NUMBER_MODE: {
          scope: 'number',
          begin: hljs.NUMBER_RE + '(' + '%|em|ex|ch|rem' + '|vw|vh|vmin|vmax' + '|cm|mm|in|pt|pc|px' + '|deg|grad|rad|turn' + '|s|ms' + '|Hz|kHz' + '|dpi|dpcm|dppx' + ')?',
          relevance: 0
        },
        CSS_VARIABLE: {
          className: "attr",
          begin: /--[A-Za-z][A-Za-z0-9_-]*/
        }
      };
    };
    const TAGS = ['a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'blockquote', 'body', 'button', 'canvas', 'caption', 'cite', 'code', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'mark', 'menu', 'nav', 'object', 'ol', 'p', 'q', 'quote', 'samp', 'section', 'span', 'strong', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'ul', 'var', 'video'];
    const MEDIA_FEATURES = ['any-hover', 'any-pointer', 'aspect-ratio', 'color', 'color-gamut', 'color-index', 'device-aspect-ratio', 'device-height', 'device-width', 'display-mode', 'forced-colors', 'grid', 'height', 'hover', 'inverted-colors', 'monochrome', 'orientation', 'overflow-block', 'overflow-inline', 'pointer', 'prefers-color-scheme', 'prefers-contrast', 'prefers-reduced-motion', 'prefers-reduced-transparency', 'resolution', 'scan', 'scripting', 'update', 'width',
    // TODO: find a better solution?
    'min-width', 'max-width', 'min-height', 'max-height'];

    // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
    const PSEUDO_CLASSES = ['active', 'any-link', 'blank', 'checked', 'current', 'default', 'defined', 'dir',
    // dir()
    'disabled', 'drop', 'empty', 'enabled', 'first', 'first-child', 'first-of-type', 'fullscreen', 'future', 'focus', 'focus-visible', 'focus-within', 'has',
    // has()
    'host',
    // host or host()
    'host-context',
    // host-context()
    'hover', 'indeterminate', 'in-range', 'invalid', 'is',
    // is()
    'lang',
    // lang()
    'last-child', 'last-of-type', 'left', 'link', 'local-link', 'not',
    // not()
    'nth-child',
    // nth-child()
    'nth-col',
    // nth-col()
    'nth-last-child',
    // nth-last-child()
    'nth-last-col',
    // nth-last-col()
    'nth-last-of-type',
    //nth-last-of-type()
    'nth-of-type',
    //nth-of-type()
    'only-child', 'only-of-type', 'optional', 'out-of-range', 'past', 'placeholder-shown', 'read-only', 'read-write', 'required', 'right', 'root', 'scope', 'target', 'target-within', 'user-invalid', 'valid', 'visited', 'where' // where()
    ];

    // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
    const PSEUDO_ELEMENTS = ['after', 'backdrop', 'before', 'cue', 'cue-region', 'first-letter', 'first-line', 'grammar-error', 'marker', 'part', 'placeholder', 'selection', 'slotted', 'spelling-error'];
    const ATTRIBUTES = ['align-content', 'align-items', 'align-self', 'all', 'animation', 'animation-delay', 'animation-direction', 'animation-duration', 'animation-fill-mode', 'animation-iteration-count', 'animation-name', 'animation-play-state', 'animation-timing-function', 'backface-visibility', 'background', 'background-attachment', 'background-blend-mode', 'background-clip', 'background-color', 'background-image', 'background-origin', 'background-position', 'background-repeat', 'background-size', 'block-size', 'border', 'border-block', 'border-block-color', 'border-block-end', 'border-block-end-color', 'border-block-end-style', 'border-block-end-width', 'border-block-start', 'border-block-start-color', 'border-block-start-style', 'border-block-start-width', 'border-block-style', 'border-block-width', 'border-bottom', 'border-bottom-color', 'border-bottom-left-radius', 'border-bottom-right-radius', 'border-bottom-style', 'border-bottom-width', 'border-collapse', 'border-color', 'border-image', 'border-image-outset', 'border-image-repeat', 'border-image-slice', 'border-image-source', 'border-image-width', 'border-inline', 'border-inline-color', 'border-inline-end', 'border-inline-end-color', 'border-inline-end-style', 'border-inline-end-width', 'border-inline-start', 'border-inline-start-color', 'border-inline-start-style', 'border-inline-start-width', 'border-inline-style', 'border-inline-width', 'border-left', 'border-left-color', 'border-left-style', 'border-left-width', 'border-radius', 'border-right', 'border-right-color', 'border-right-style', 'border-right-width', 'border-spacing', 'border-style', 'border-top', 'border-top-color', 'border-top-left-radius', 'border-top-right-radius', 'border-top-style', 'border-top-width', 'border-width', 'bottom', 'box-decoration-break', 'box-shadow', 'box-sizing', 'break-after', 'break-before', 'break-inside', 'caption-side', 'caret-color', 'clear', 'clip', 'clip-path', 'clip-rule', 'color', 'column-count', 'column-fill', 'column-gap', 'column-rule', 'column-rule-color', 'column-rule-style', 'column-rule-width', 'column-span', 'column-width', 'columns', 'contain', 'content', 'content-visibility', 'counter-increment', 'counter-reset', 'cue', 'cue-after', 'cue-before', 'cursor', 'direction', 'display', 'empty-cells', 'filter', 'flex', 'flex-basis', 'flex-direction', 'flex-flow', 'flex-grow', 'flex-shrink', 'flex-wrap', 'float', 'flow', 'font', 'font-display', 'font-family', 'font-feature-settings', 'font-kerning', 'font-language-override', 'font-size', 'font-size-adjust', 'font-smoothing', 'font-stretch', 'font-style', 'font-synthesis', 'font-variant', 'font-variant-caps', 'font-variant-east-asian', 'font-variant-ligatures', 'font-variant-numeric', 'font-variant-position', 'font-variation-settings', 'font-weight', 'gap', 'glyph-orientation-vertical', 'grid', 'grid-area', 'grid-auto-columns', 'grid-auto-flow', 'grid-auto-rows', 'grid-column', 'grid-column-end', 'grid-column-start', 'grid-gap', 'grid-row', 'grid-row-end', 'grid-row-start', 'grid-template', 'grid-template-areas', 'grid-template-columns', 'grid-template-rows', 'hanging-punctuation', 'height', 'hyphens', 'icon', 'image-orientation', 'image-rendering', 'image-resolution', 'ime-mode', 'inline-size', 'isolation', 'justify-content', 'left', 'letter-spacing', 'line-break', 'line-height', 'list-style', 'list-style-image', 'list-style-position', 'list-style-type', 'margin', 'margin-block', 'margin-block-end', 'margin-block-start', 'margin-bottom', 'margin-inline', 'margin-inline-end', 'margin-inline-start', 'margin-left', 'margin-right', 'margin-top', 'marks', 'mask', 'mask-border', 'mask-border-mode', 'mask-border-outset', 'mask-border-repeat', 'mask-border-slice', 'mask-border-source', 'mask-border-width', 'mask-clip', 'mask-composite', 'mask-image', 'mask-mode', 'mask-origin', 'mask-position', 'mask-repeat', 'mask-size', 'mask-type', 'max-block-size', 'max-height', 'max-inline-size', 'max-width', 'min-block-size', 'min-height', 'min-inline-size', 'min-width', 'mix-blend-mode', 'nav-down', 'nav-index', 'nav-left', 'nav-right', 'nav-up', 'none', 'normal', 'object-fit', 'object-position', 'opacity', 'order', 'orphans', 'outline', 'outline-color', 'outline-offset', 'outline-style', 'outline-width', 'overflow', 'overflow-wrap', 'overflow-x', 'overflow-y', 'padding', 'padding-block', 'padding-block-end', 'padding-block-start', 'padding-bottom', 'padding-inline', 'padding-inline-end', 'padding-inline-start', 'padding-left', 'padding-right', 'padding-top', 'page-break-after', 'page-break-before', 'page-break-inside', 'pause', 'pause-after', 'pause-before', 'perspective', 'perspective-origin', 'pointer-events', 'position', 'quotes', 'resize', 'rest', 'rest-after', 'rest-before', 'right', 'row-gap', 'scroll-margin', 'scroll-margin-block', 'scroll-margin-block-end', 'scroll-margin-block-start', 'scroll-margin-bottom', 'scroll-margin-inline', 'scroll-margin-inline-end', 'scroll-margin-inline-start', 'scroll-margin-left', 'scroll-margin-right', 'scroll-margin-top', 'scroll-padding', 'scroll-padding-block', 'scroll-padding-block-end', 'scroll-padding-block-start', 'scroll-padding-bottom', 'scroll-padding-inline', 'scroll-padding-inline-end', 'scroll-padding-inline-start', 'scroll-padding-left', 'scroll-padding-right', 'scroll-padding-top', 'scroll-snap-align', 'scroll-snap-stop', 'scroll-snap-type', 'scrollbar-color', 'scrollbar-gutter', 'scrollbar-width', 'shape-image-threshold', 'shape-margin', 'shape-outside', 'speak', 'speak-as', 'src',
    // @font-face
    'tab-size', 'table-layout', 'text-align', 'text-align-all', 'text-align-last', 'text-combine-upright', 'text-decoration', 'text-decoration-color', 'text-decoration-line', 'text-decoration-style', 'text-emphasis', 'text-emphasis-color', 'text-emphasis-position', 'text-emphasis-style', 'text-indent', 'text-justify', 'text-orientation', 'text-overflow', 'text-rendering', 'text-shadow', 'text-transform', 'text-underline-position', 'top', 'transform', 'transform-box', 'transform-origin', 'transform-style', 'transition', 'transition-delay', 'transition-duration', 'transition-property', 'transition-timing-function', 'unicode-bidi', 'vertical-align', 'visibility', 'voice-balance', 'voice-duration', 'voice-family', 'voice-pitch', 'voice-range', 'voice-rate', 'voice-stress', 'voice-volume', 'white-space', 'widows', 'width', 'will-change', 'word-break', 'word-spacing', 'word-wrap', 'writing-mode', 'z-index'
    // reverse makes sure longer attributes `font-weight` are matched fully
    // instead of getting false positives on say `font`
    ].reverse();

    // some grammars use them all as a single group
    const PSEUDO_SELECTORS = PSEUDO_CLASSES.concat(PSEUDO_ELEMENTS);

    /*
    Language: Less
    Description: It's CSS, with just a little more.
    Author:   Max Mikhailov <seven.phases.max@gmail.com>
    Website: http://lesscss.org
    Category: common, css, web
    */

    /** @type LanguageFn */
    function less(hljs) {
      const modes = MODES(hljs);
      const PSEUDO_SELECTORS$1 = PSEUDO_SELECTORS;
      const AT_MODIFIERS = "and or not only";
      const IDENT_RE = '[\\w-]+'; // yes, Less identifiers may begin with a digit
      const INTERP_IDENT_RE = '(' + IDENT_RE + '|@\\{' + IDENT_RE + '\\})';

      /* Generic Modes */

      const RULES = [];
      const VALUE_MODES = []; // forward def. for recursive modes

      const STRING_MODE = function (c) {
        return {
          // Less strings are not multiline (also include '~' for more consistent coloring of "escaped" strings)
          className: 'string',
          begin: '~?' + c + '.*?' + c
        };
      };
      const IDENT_MODE = function (name, begin, relevance) {
        return {
          className: name,
          begin: begin,
          relevance: relevance
        };
      };
      const AT_KEYWORDS = {
        $pattern: /[a-z-]+/,
        keyword: AT_MODIFIERS,
        attribute: MEDIA_FEATURES.join(" ")
      };
      const PARENS_MODE = {
        // used only to properly balance nested parens inside mixin call, def. arg list
        begin: '\\(',
        end: '\\)',
        contains: VALUE_MODES,
        keywords: AT_KEYWORDS,
        relevance: 0
      };

      // generic Less highlighter (used almost everywhere except selectors):
      VALUE_MODES.push(hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, STRING_MODE("'"), STRING_MODE('"'), modes.CSS_NUMBER_MODE,
      // fixme: it does not include dot for numbers like .5em :(
      {
        begin: '(url|data-uri)\\(',
        starts: {
          className: 'string',
          end: '[\\)\\n]',
          excludeEnd: true
        }
      }, modes.HEXCOLOR, PARENS_MODE, IDENT_MODE('variable', '@@?' + IDENT_RE, 10), IDENT_MODE('variable', '@\\{' + IDENT_RE + '\\}'), IDENT_MODE('built_in', '~?`[^`]*?`'),
      // inline javascript (or whatever host language) *multiline* string
      {
        // @media features (it’s here to not duplicate things in AT_RULE_MODE with extra PARENS_MODE overriding):
        className: 'attribute',
        begin: IDENT_RE + '\\s*:',
        end: ':',
        returnBegin: true,
        excludeEnd: true
      }, modes.IMPORTANT, {
        beginKeywords: 'and not'
      }, modes.FUNCTION_DISPATCH);
      const VALUE_WITH_RULESETS = VALUE_MODES.concat({
        begin: /\{/,
        end: /\}/,
        contains: RULES
      });
      const MIXIN_GUARD_MODE = {
        beginKeywords: 'when',
        endsWithParent: true,
        contains: [{
          beginKeywords: 'and not'
        }].concat(VALUE_MODES) // using this form to override VALUE’s 'function' match
      };

      /* Rule-Level Modes */

      const RULE_MODE = {
        begin: INTERP_IDENT_RE + '\\s*:',
        returnBegin: true,
        end: /[;}]/,
        relevance: 0,
        contains: [{
          begin: /-(webkit|moz|ms|o)-/
        }, modes.CSS_VARIABLE, {
          className: 'attribute',
          begin: '\\b(' + ATTRIBUTES.join('|') + ')\\b',
          end: /(?=:)/,
          starts: {
            endsWithParent: true,
            illegal: '[<=$]',
            relevance: 0,
            contains: VALUE_MODES
          }
        }]
      };
      const AT_RULE_MODE = {
        className: 'keyword',
        begin: '@(import|media|charset|font-face|(-[a-z]+-)?keyframes|supports|document|namespace|page|viewport|host)\\b',
        starts: {
          end: '[;{}]',
          keywords: AT_KEYWORDS,
          returnEnd: true,
          contains: VALUE_MODES,
          relevance: 0
        }
      };

      // variable definitions and calls
      const VAR_RULE_MODE = {
        className: 'variable',
        variants: [
        // using more strict pattern for higher relevance to increase chances of Less detection.
        // this is *the only* Less specific statement used in most of the sources, so...
        // (we’ll still often loose to the css-parser unless there's '//' comment,
        // simply because 1 variable just can't beat 99 properties :)
        {
          begin: '@' + IDENT_RE + '\\s*:',
          relevance: 15
        }, {
          begin: '@' + IDENT_RE
        }],
        starts: {
          end: '[;}]',
          returnEnd: true,
          contains: VALUE_WITH_RULESETS
        }
      };
      const SELECTOR_MODE = {
        // first parse unambiguous selectors (i.e. those not starting with tag)
        // then fall into the scary lookahead-discriminator variant.
        // this mode also handles mixin definitions and calls
        variants: [{
          begin: '[\\.#:&\\[>]',
          end: '[;{}]' // mixin calls end with ';'
        }, {
          begin: INTERP_IDENT_RE,
          end: /\{/
        }],
        returnBegin: true,
        returnEnd: true,
        illegal: '[<=\'$"]',
        relevance: 0,
        contains: [hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, MIXIN_GUARD_MODE, IDENT_MODE('keyword', 'all\\b'), IDENT_MODE('variable', '@\\{' + IDENT_RE + '\\}'),
        // otherwise it’s identified as tag

        {
          begin: '\\b(' + TAGS.join('|') + ')\\b',
          className: 'selector-tag'
        }, modes.CSS_NUMBER_MODE, IDENT_MODE('selector-tag', INTERP_IDENT_RE, 0), IDENT_MODE('selector-id', '#' + INTERP_IDENT_RE), IDENT_MODE('selector-class', '\\.' + INTERP_IDENT_RE, 0), IDENT_MODE('selector-tag', '&', 0), modes.ATTRIBUTE_SELECTOR_MODE, {
          className: 'selector-pseudo',
          begin: ':(' + PSEUDO_CLASSES.join('|') + ')'
        }, {
          className: 'selector-pseudo',
          begin: ':(:)?(' + PSEUDO_ELEMENTS.join('|') + ')'
        }, {
          begin: /\(/,
          end: /\)/,
          relevance: 0,
          contains: VALUE_WITH_RULESETS
        },
        // argument list of parametric mixins
        {
          begin: '!important'
        },
        // eat !important after mixin call or it will be colored as tag
        modes.FUNCTION_DISPATCH]
      };
      const PSEUDO_SELECTOR_MODE = {
        begin: IDENT_RE + ':(:)?' + `(${PSEUDO_SELECTORS$1.join('|')})`,
        returnBegin: true,
        contains: [SELECTOR_MODE]
      };
      RULES.push(hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, AT_RULE_MODE, VAR_RULE_MODE, PSEUDO_SELECTOR_MODE, RULE_MODE, SELECTOR_MODE, MIXIN_GUARD_MODE, modes.FUNCTION_DISPATCH);
      return {
        name: 'Less',
        case_insensitive: true,
        illegal: '[=>\'/<($"]',
        contains: RULES
      };
    }
    less_1 = less;
    return less_1;
  }

  /*
  Language: Lua
  Description: Lua is a powerful, efficient, lightweight, embeddable scripting language.
  Author: Andrew Fedorov <dmmdrs@mail.ru>
  Category: common, scripting
  Website: https://www.lua.org
  */
  var lua_1;
  var hasRequiredLua;
  function requireLua() {
    if (hasRequiredLua) return lua_1;
    hasRequiredLua = 1;
    function lua(hljs) {
      const OPENING_LONG_BRACKET = '\\[=*\\[';
      const CLOSING_LONG_BRACKET = '\\]=*\\]';
      const LONG_BRACKETS = {
        begin: OPENING_LONG_BRACKET,
        end: CLOSING_LONG_BRACKET,
        contains: ['self']
      };
      const COMMENTS = [hljs.COMMENT('--(?!' + OPENING_LONG_BRACKET + ')', '$'), hljs.COMMENT('--' + OPENING_LONG_BRACKET, CLOSING_LONG_BRACKET, {
        contains: [LONG_BRACKETS],
        relevance: 10
      })];
      return {
        name: 'Lua',
        keywords: {
          $pattern: hljs.UNDERSCORE_IDENT_RE,
          literal: "true false nil",
          keyword: "and break do else elseif end for goto if in local not or repeat return then until while",
          built_in:
          // Metatags and globals:
          '_G _ENV _VERSION __index __newindex __mode __call __metatable __tostring __len ' + '__gc __add __sub __mul __div __mod __pow __concat __unm __eq __lt __le assert '
          // Standard methods and properties:
          + 'collectgarbage dofile error getfenv getmetatable ipairs load loadfile loadstring ' + 'module next pairs pcall print rawequal rawget rawset require select setfenv ' + 'setmetatable tonumber tostring type unpack xpcall arg self '
          // Library methods and properties (one line per library):
          + 'coroutine resume yield status wrap create running debug getupvalue ' + 'debug sethook getmetatable gethook setmetatable setlocal traceback setfenv getinfo setupvalue getlocal getregistry getfenv ' + 'io lines write close flush open output type read stderr stdin input stdout popen tmpfile ' + 'math log max acos huge ldexp pi cos tanh pow deg tan cosh sinh random randomseed frexp ceil floor rad abs sqrt modf asin min mod fmod log10 atan2 exp sin atan ' + 'os exit setlocale date getenv difftime remove time clock tmpname rename execute package preload loadlib loaded loaders cpath config path seeall ' + 'string sub upper len gfind rep find match char dump gmatch reverse byte format gsub lower ' + 'table setn insert getn foreachi maxn foreach concat sort remove'
        },
        contains: COMMENTS.concat([{
          className: 'function',
          beginKeywords: 'function',
          end: '\\)',
          contains: [hljs.inherit(hljs.TITLE_MODE, {
            begin: '([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*'
          }), {
            className: 'params',
            begin: '\\(',
            endsWithParent: true,
            contains: COMMENTS
          }].concat(COMMENTS)
        }, hljs.C_NUMBER_MODE, hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE, {
          className: 'string',
          begin: OPENING_LONG_BRACKET,
          end: CLOSING_LONG_BRACKET,
          contains: [LONG_BRACKETS],
          relevance: 5
        }])
      };
    }
    lua_1 = lua;
    return lua_1;
  }

  /*
  Language: Makefile
  Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Contributors: Joël Porquet <joel@porquet.org>
  Website: https://www.gnu.org/software/make/manual/html_node/Introduction.html
  Category: common
  */
  var makefile_1;
  var hasRequiredMakefile;
  function requireMakefile() {
    if (hasRequiredMakefile) return makefile_1;
    hasRequiredMakefile = 1;
    function makefile(hljs) {
      /* Variables: simple (eg $(var)) and special (eg $@) */
      const VARIABLE = {
        className: 'variable',
        variants: [{
          begin: '\\$\\(' + hljs.UNDERSCORE_IDENT_RE + '\\)',
          contains: [hljs.BACKSLASH_ESCAPE]
        }, {
          begin: /\$[@%<?\^\+\*]/
        }]
      };
      /* Quoted string with variables inside */
      const QUOTE_STRING = {
        className: 'string',
        begin: /"/,
        end: /"/,
        contains: [hljs.BACKSLASH_ESCAPE, VARIABLE]
      };
      /* Function: $(func arg,...) */
      const FUNC = {
        className: 'variable',
        begin: /\$\([\w-]+\s/,
        end: /\)/,
        keywords: {
          built_in: 'subst patsubst strip findstring filter filter-out sort ' + 'word wordlist firstword lastword dir notdir suffix basename ' + 'addsuffix addprefix join wildcard realpath abspath error warning ' + 'shell origin flavor foreach if or and call eval file value'
        },
        contains: [VARIABLE]
      };
      /* Variable assignment */
      const ASSIGNMENT = {
        begin: '^' + hljs.UNDERSCORE_IDENT_RE + '\\s*(?=[:+?]?=)'
      };
      /* Meta targets (.PHONY) */
      const META = {
        className: 'meta',
        begin: /^\.PHONY:/,
        end: /$/,
        keywords: {
          $pattern: /[\.\w]+/,
          keyword: '.PHONY'
        }
      };
      /* Targets */
      const TARGET = {
        className: 'section',
        begin: /^[^\s]+:/,
        end: /$/,
        contains: [VARIABLE]
      };
      return {
        name: 'Makefile',
        aliases: ['mk', 'mak', 'make'],
        keywords: {
          $pattern: /[\w-]+/,
          keyword: 'define endef undefine ifdef ifndef ifeq ifneq else endif ' + 'include -include sinclude override export unexport private vpath'
        },
        contains: [hljs.HASH_COMMENT_MODE, VARIABLE, QUOTE_STRING, FUNC, ASSIGNMENT, META, TARGET]
      };
    }
    makefile_1 = makefile;
    return makefile_1;
  }

  /*
  Language: Perl
  Author: Peter Leonov <gojpeg@yandex.ru>
  Website: https://www.perl.org
  Category: common
  */
  var perl_1;
  var hasRequiredPerl;
  function requirePerl() {
    if (hasRequiredPerl) return perl_1;
    hasRequiredPerl = 1;
    /** @type LanguageFn */
    function perl(hljs) {
      const regex = hljs.regex;
      const KEYWORDS = ['abs', 'accept', 'alarm', 'and', 'atan2', 'bind', 'binmode', 'bless', 'break', 'caller', 'chdir', 'chmod', 'chomp', 'chop', 'chown', 'chr', 'chroot', 'close', 'closedir', 'connect', 'continue', 'cos', 'crypt', 'dbmclose', 'dbmopen', 'defined', 'delete', 'die', 'do', 'dump', 'each', 'else', 'elsif', 'endgrent', 'endhostent', 'endnetent', 'endprotoent', 'endpwent', 'endservent', 'eof', 'eval', 'exec', 'exists', 'exit', 'exp', 'fcntl', 'fileno', 'flock', 'for', 'foreach', 'fork', 'format', 'formline', 'getc', 'getgrent', 'getgrgid', 'getgrnam', 'gethostbyaddr', 'gethostbyname', 'gethostent', 'getlogin', 'getnetbyaddr', 'getnetbyname', 'getnetent', 'getpeername', 'getpgrp', 'getpriority', 'getprotobyname', 'getprotobynumber', 'getprotoent', 'getpwent', 'getpwnam', 'getpwuid', 'getservbyname', 'getservbyport', 'getservent', 'getsockname', 'getsockopt', 'given', 'glob', 'gmtime', 'goto', 'grep', 'gt', 'hex', 'if', 'index', 'int', 'ioctl', 'join', 'keys', 'kill', 'last', 'lc', 'lcfirst', 'length', 'link', 'listen', 'local', 'localtime', 'log', 'lstat', 'lt', 'ma', 'map', 'mkdir', 'msgctl', 'msgget', 'msgrcv', 'msgsnd', 'my', 'ne', 'next', 'no', 'not', 'oct', 'open', 'opendir', 'or', 'ord', 'our', 'pack', 'package', 'pipe', 'pop', 'pos', 'print', 'printf', 'prototype', 'push', 'q|0', 'qq', 'quotemeta', 'qw', 'qx', 'rand', 'read', 'readdir', 'readline', 'readlink', 'readpipe', 'recv', 'redo', 'ref', 'rename', 'require', 'reset', 'return', 'reverse', 'rewinddir', 'rindex', 'rmdir', 'say', 'scalar', 'seek', 'seekdir', 'select', 'semctl', 'semget', 'semop', 'send', 'setgrent', 'sethostent', 'setnetent', 'setpgrp', 'setpriority', 'setprotoent', 'setpwent', 'setservent', 'setsockopt', 'shift', 'shmctl', 'shmget', 'shmread', 'shmwrite', 'shutdown', 'sin', 'sleep', 'socket', 'socketpair', 'sort', 'splice', 'split', 'sprintf', 'sqrt', 'srand', 'stat', 'state', 'study', 'sub', 'substr', 'symlink', 'syscall', 'sysopen', 'sysread', 'sysseek', 'system', 'syswrite', 'tell', 'telldir', 'tie', 'tied', 'time', 'times', 'tr', 'truncate', 'uc', 'ucfirst', 'umask', 'undef', 'unless', 'unlink', 'unpack', 'unshift', 'untie', 'until', 'use', 'utime', 'values', 'vec', 'wait', 'waitpid', 'wantarray', 'warn', 'when', 'while', 'write', 'x|0', 'xor', 'y|0'];

      // https://perldoc.perl.org/perlre#Modifiers
      const REGEX_MODIFIERS = /[dualxmsipngr]{0,12}/; // aa and xx are valid, making max length 12
      const PERL_KEYWORDS = {
        $pattern: /[\w.]+/,
        keyword: KEYWORDS.join(" ")
      };
      const SUBST = {
        className: 'subst',
        begin: '[$@]\\{',
        end: '\\}',
        keywords: PERL_KEYWORDS
      };
      const METHOD = {
        begin: /->\{/,
        end: /\}/
        // contains defined later
      };

      const VAR = {
        variants: [{
          begin: /\$\d/
        }, {
          begin: regex.concat(/[$%@](\^\w\b|#\w+(::\w+)*|\{\w+\}|\w+(::\w*)*)/,
          // negative look-ahead tries to avoid matching patterns that are not
          // Perl at all like $ident$, @ident@, etc.
          `(?![A-Za-z])(?![@$%])`)
        }, {
          begin: /[$%@][^\s\w{]/,
          relevance: 0
        }]
      };
      const STRING_CONTAINS = [hljs.BACKSLASH_ESCAPE, SUBST, VAR];
      const REGEX_DELIMS = [/!/, /\//, /\|/, /\?/, /'/, /"/,
      // valid but infrequent and weird
      /#/ // valid but infrequent and weird
      ];
      /**
       * @param {string|RegExp} prefix
       * @param {string|RegExp} open
       * @param {string|RegExp} close
       */
      const PAIRED_DOUBLE_RE = (prefix, open, close = '\\1') => {
        const middle = close === '\\1' ? close : regex.concat(close, open);
        return regex.concat(regex.concat("(?:", prefix, ")"), open, /(?:\\.|[^\\\/])*?/, middle, /(?:\\.|[^\\\/])*?/, close, REGEX_MODIFIERS);
      };
      /**
       * @param {string|RegExp} prefix
       * @param {string|RegExp} open
       * @param {string|RegExp} close
       */
      const PAIRED_RE = (prefix, open, close) => {
        return regex.concat(regex.concat("(?:", prefix, ")"), open, /(?:\\.|[^\\\/])*?/, close, REGEX_MODIFIERS);
      };
      const PERL_DEFAULT_CONTAINS = [VAR, hljs.HASH_COMMENT_MODE, hljs.COMMENT(/^=\w/, /=cut/, {
        endsWithParent: true
      }), METHOD, {
        className: 'string',
        contains: STRING_CONTAINS,
        variants: [{
          begin: 'q[qwxr]?\\s*\\(',
          end: '\\)',
          relevance: 5
        }, {
          begin: 'q[qwxr]?\\s*\\[',
          end: '\\]',
          relevance: 5
        }, {
          begin: 'q[qwxr]?\\s*\\{',
          end: '\\}',
          relevance: 5
        }, {
          begin: 'q[qwxr]?\\s*\\|',
          end: '\\|',
          relevance: 5
        }, {
          begin: 'q[qwxr]?\\s*<',
          end: '>',
          relevance: 5
        }, {
          begin: 'qw\\s+q',
          end: 'q',
          relevance: 5
        }, {
          begin: '\'',
          end: '\'',
          contains: [hljs.BACKSLASH_ESCAPE]
        }, {
          begin: '"',
          end: '"'
        }, {
          begin: '`',
          end: '`',
          contains: [hljs.BACKSLASH_ESCAPE]
        }, {
          begin: /\{\w+\}/,
          relevance: 0
        }, {
          begin: '-?\\w+\\s*=>',
          relevance: 0
        }]
      }, {
        className: 'number',
        begin: '(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b',
        relevance: 0
      }, {
        // regexp container
        begin: '(\\/\\/|' + hljs.RE_STARTERS_RE + '|\\b(split|return|print|reverse|grep)\\b)\\s*',
        keywords: 'split return print reverse grep',
        relevance: 0,
        contains: [hljs.HASH_COMMENT_MODE, {
          className: 'regexp',
          variants: [
          // allow matching common delimiters
          {
            begin: PAIRED_DOUBLE_RE("s|tr|y", regex.either(...REGEX_DELIMS, {
              capture: true
            }))
          },
          // and then paired delmis
          {
            begin: PAIRED_DOUBLE_RE("s|tr|y", "\\(", "\\)")
          }, {
            begin: PAIRED_DOUBLE_RE("s|tr|y", "\\[", "\\]")
          }, {
            begin: PAIRED_DOUBLE_RE("s|tr|y", "\\{", "\\}")
          }],
          relevance: 2
        }, {
          className: 'regexp',
          variants: [{
            // could be a comment in many languages so do not count
            // as relevant
            begin: /(m|qr)\/\//,
            relevance: 0
          },
          // prefix is optional with /regex/
          {
            begin: PAIRED_RE("(?:m|qr)?", /\//, /\//)
          },
          // allow matching common delimiters
          {
            begin: PAIRED_RE("m|qr", regex.either(...REGEX_DELIMS, {
              capture: true
            }), /\1/)
          },
          // allow common paired delmins
          {
            begin: PAIRED_RE("m|qr", /\(/, /\)/)
          }, {
            begin: PAIRED_RE("m|qr", /\[/, /\]/)
          }, {
            begin: PAIRED_RE("m|qr", /\{/, /\}/)
          }]
        }]
      }, {
        className: 'function',
        beginKeywords: 'sub',
        end: '(\\s*\\(.*?\\))?[;{]',
        excludeEnd: true,
        relevance: 5,
        contains: [hljs.TITLE_MODE]
      }, {
        begin: '-\\w\\b',
        relevance: 0
      }, {
        begin: "^__DATA__$",
        end: "^__END__$",
        subLanguage: 'mojolicious',
        contains: [{
          begin: "^@@.*",
          end: "$",
          className: "comment"
        }]
      }];
      SUBST.contains = PERL_DEFAULT_CONTAINS;
      METHOD.contains = PERL_DEFAULT_CONTAINS;
      return {
        name: 'Perl',
        aliases: ['pl', 'pm'],
        keywords: PERL_KEYWORDS,
        contains: PERL_DEFAULT_CONTAINS
      };
    }
    perl_1 = perl;
    return perl_1;
  }

  /*
  Language: Objective-C
  Author: Valerii Hiora <valerii.hiora@gmail.com>
  Contributors: Angel G. Olloqui <angelgarcia.mail@gmail.com>, Matt Diephouse <matt@diephouse.com>, Andrew Farmer <ahfarmer@gmail.com>, Minh Nguyễn <mxn@1ec5.org>
  Website: https://developer.apple.com/documentation/objectivec
  Category: common
  */
  var objectivec_1;
  var hasRequiredObjectivec;
  function requireObjectivec() {
    if (hasRequiredObjectivec) return objectivec_1;
    hasRequiredObjectivec = 1;
    function objectivec(hljs) {
      const API_CLASS = {
        className: 'built_in',
        begin: '\\b(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)\\w+'
      };
      const IDENTIFIER_RE = /[a-zA-Z@][a-zA-Z0-9_]*/;
      const TYPES = ["int", "float", "char", "unsigned", "signed", "short", "long", "double", "wchar_t", "unichar", "void", "bool", "BOOL", "id|0", "_Bool"];
      const KWS = ["while", "export", "sizeof", "typedef", "const", "struct", "for", "union", "volatile", "static", "mutable", "if", "do", "return", "goto", "enum", "else", "break", "extern", "asm", "case", "default", "register", "explicit", "typename", "switch", "continue", "inline", "readonly", "assign", "readwrite", "self", "@synchronized", "id", "typeof", "nonatomic", "IBOutlet", "IBAction", "strong", "weak", "copy", "in", "out", "inout", "bycopy", "byref", "oneway", "__strong", "__weak", "__block", "__autoreleasing", "@private", "@protected", "@public", "@try", "@property", "@end", "@throw", "@catch", "@finally", "@autoreleasepool", "@synthesize", "@dynamic", "@selector", "@optional", "@required", "@encode", "@package", "@import", "@defs", "@compatibility_alias", "__bridge", "__bridge_transfer", "__bridge_retained", "__bridge_retain", "__covariant", "__contravariant", "__kindof", "_Nonnull", "_Nullable", "_Null_unspecified", "__FUNCTION__", "__PRETTY_FUNCTION__", "__attribute__", "getter", "setter", "retain", "unsafe_unretained", "nonnull", "nullable", "null_unspecified", "null_resettable", "class", "instancetype", "NS_DESIGNATED_INITIALIZER", "NS_UNAVAILABLE", "NS_REQUIRES_SUPER", "NS_RETURNS_INNER_POINTER", "NS_INLINE", "NS_AVAILABLE", "NS_DEPRECATED", "NS_ENUM", "NS_OPTIONS", "NS_SWIFT_UNAVAILABLE", "NS_ASSUME_NONNULL_BEGIN", "NS_ASSUME_NONNULL_END", "NS_REFINED_FOR_SWIFT", "NS_SWIFT_NAME", "NS_SWIFT_NOTHROW", "NS_DURING", "NS_HANDLER", "NS_ENDHANDLER", "NS_VALUERETURN", "NS_VOIDRETURN"];
      const LITERALS = ["false", "true", "FALSE", "TRUE", "nil", "YES", "NO", "NULL"];
      const BUILT_INS = ["dispatch_once_t", "dispatch_queue_t", "dispatch_sync", "dispatch_async", "dispatch_once"];
      const KEYWORDS = {
        "variable.language": ["this", "super"],
        $pattern: IDENTIFIER_RE,
        keyword: KWS,
        literal: LITERALS,
        built_in: BUILT_INS,
        type: TYPES
      };
      const CLASS_KEYWORDS = {
        $pattern: IDENTIFIER_RE,
        keyword: ["@interface", "@class", "@protocol", "@implementation"]
      };
      return {
        name: 'Objective-C',
        aliases: ['mm', 'objc', 'obj-c', 'obj-c++', 'objective-c++'],
        keywords: KEYWORDS,
        illegal: '</',
        contains: [API_CLASS, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE, hljs.C_NUMBER_MODE, hljs.QUOTE_STRING_MODE, hljs.APOS_STRING_MODE, {
          className: 'string',
          variants: [{
            begin: '@"',
            end: '"',
            illegal: '\\n',
            contains: [hljs.BACKSLASH_ESCAPE]
          }]
        }, {
          className: 'meta',
          begin: /#\s*[a-z]+\b/,
          end: /$/,
          keywords: {
            keyword: 'if else elif endif define undef warning error line ' + 'pragma ifdef ifndef include'
          },
          contains: [{
            begin: /\\\n/,
            relevance: 0
          }, hljs.inherit(hljs.QUOTE_STRING_MODE, {
            className: 'string'
          }), {
            className: 'string',
            begin: /<.*?>/,
            end: /$/,
            illegal: '\\n'
          }, hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE]
        }, {
          className: 'class',
          begin: '(' + CLASS_KEYWORDS.keyword.join('|') + ')\\b',
          end: /(\{|$)/,
          excludeEnd: true,
          keywords: CLASS_KEYWORDS,
          contains: [hljs.UNDERSCORE_TITLE_MODE]
        }, {
          begin: '\\.' + hljs.UNDERSCORE_IDENT_RE,
          relevance: 0
        }]
      };
    }
    objectivec_1 = objectivec;
    return objectivec_1;
  }

  /*
  Language: PHP
  Author: Victor Karamzin <Victor.Karamzin@enterra-inc.com>
  Contributors: Evgeny Stepanischev <imbolk@gmail.com>, Ivan Sagalaev <maniac@softwaremaniacs.org>
  Website: https://www.php.net
  Category: common
  */
  var php_1;
  var hasRequiredPhp;
  function requirePhp() {
    if (hasRequiredPhp) return php_1;
    hasRequiredPhp = 1;
    /**
     * @param {HLJSApi} hljs
     * @returns {LanguageDetail}
     * */
    function php(hljs) {
      const regex = hljs.regex;
      // negative look-ahead tries to avoid matching patterns that are not
      // Perl at all like $ident$, @ident@, etc.
      const NOT_PERL_ETC = /(?![A-Za-z0-9])(?![$])/;
      const IDENT_RE = regex.concat(/[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/, NOT_PERL_ETC);
      // Will not detect camelCase classes
      const PASCAL_CASE_CLASS_NAME_RE = regex.concat(/(\\?[A-Z][a-z0-9_\x7f-\xff]+|\\?[A-Z]+(?=[A-Z][a-z0-9_\x7f-\xff])){1,}/, NOT_PERL_ETC);
      const VARIABLE = {
        scope: 'variable',
        match: '\\$+' + IDENT_RE
      };
      const PREPROCESSOR = {
        scope: 'meta',
        variants: [{
          begin: /<\?php/,
          relevance: 10
        },
        // boost for obvious PHP
        {
          begin: /<\?=/
        },
        // less relevant per PSR-1 which says not to use short-tags
        {
          begin: /<\?/,
          relevance: 0.1
        }, {
          begin: /\?>/
        } // end php tag
        ]
      };

      const SUBST = {
        scope: 'subst',
        variants: [{
          begin: /\$\w+/
        }, {
          begin: /\{\$/,
          end: /\}/
        }]
      };
      const SINGLE_QUOTED = hljs.inherit(hljs.APOS_STRING_MODE, {
        illegal: null
      });
      const DOUBLE_QUOTED = hljs.inherit(hljs.QUOTE_STRING_MODE, {
        illegal: null,
        contains: hljs.QUOTE_STRING_MODE.contains.concat(SUBST)
      });
      const HEREDOC = {
        begin: /<<<[ \t]*(?:(\w+)|"(\w+)")\n/,
        end: /[ \t]*(\w+)\b/,
        contains: hljs.QUOTE_STRING_MODE.contains.concat(SUBST),
        'on:begin': (m, resp) => {
          resp.data._beginMatch = m[1] || m[2];
        },
        'on:end': (m, resp) => {
          if (resp.data._beginMatch !== m[1]) resp.ignoreMatch();
        }
      };
      const NOWDOC = hljs.END_SAME_AS_BEGIN({
        begin: /<<<[ \t]*'(\w+)'\n/,
        end: /[ \t]*(\w+)\b/
      });
      // list of valid whitespaces because non-breaking space might be part of a IDENT_RE
      const WHITESPACE = '[ \t\n]';
      const STRING = {
        scope: 'string',
        variants: [DOUBLE_QUOTED, SINGLE_QUOTED, HEREDOC, NOWDOC]
      };
      const NUMBER = {
        scope: 'number',
        variants: [{
          begin: `\\b0[bB][01]+(?:_[01]+)*\\b`
        },
        // Binary w/ underscore support
        {
          begin: `\\b0[oO][0-7]+(?:_[0-7]+)*\\b`
        },
        // Octals w/ underscore support
        {
          begin: `\\b0[xX][\\da-fA-F]+(?:_[\\da-fA-F]+)*\\b`
        },
        // Hex w/ underscore support
        // Decimals w/ underscore support, with optional fragments and scientific exponent (e) suffix.
        {
          begin: `(?:\\b\\d+(?:_\\d+)*(\\.(?:\\d+(?:_\\d+)*))?|\\B\\.\\d+)(?:[eE][+-]?\\d+)?`
        }],
        relevance: 0
      };
      const LITERALS = ["false", "null", "true"];
      const KWS = [
      // Magic constants:
      // <https://www.php.net/manual/en/language.constants.predefined.php>
      "__CLASS__", "__DIR__", "__FILE__", "__FUNCTION__", "__COMPILER_HALT_OFFSET__", "__LINE__", "__METHOD__", "__NAMESPACE__", "__TRAIT__",
      // Function that look like language construct or language construct that look like function:
      // List of keywords that may not require parenthesis
      "die", "echo", "exit", "include", "include_once", "print", "require", "require_once",
      // These are not language construct (function) but operate on the currently-executing function and can access the current symbol table
      // 'compact extract func_get_arg func_get_args func_num_args get_called_class get_parent_class ' +
      // Other keywords:
      // <https://www.php.net/manual/en/reserved.php>
      // <https://www.php.net/manual/en/language.types.type-juggling.php>
      "array", "abstract", "and", "as", "binary", "bool", "boolean", "break", "callable", "case", "catch", "class", "clone", "const", "continue", "declare", "default", "do", "double", "else", "elseif", "empty", "enddeclare", "endfor", "endforeach", "endif", "endswitch", "endwhile", "enum", "eval", "extends", "final", "finally", "float", "for", "foreach", "from", "global", "goto", "if", "implements", "instanceof", "insteadof", "int", "integer", "interface", "isset", "iterable", "list", "match|0", "mixed", "new", "never", "object", "or", "private", "protected", "public", "readonly", "real", "return", "string", "switch", "throw", "trait", "try", "unset", "use", "var", "void", "while", "xor", "yield"];
      const BUILT_INS = [
      // Standard PHP library:
      // <https://www.php.net/manual/en/book.spl.php>
      "Error|0", "AppendIterator", "ArgumentCountError", "ArithmeticError", "ArrayIterator", "ArrayObject", "AssertionError", "BadFunctionCallException", "BadMethodCallException", "CachingIterator", "CallbackFilterIterator", "CompileError", "Countable", "DirectoryIterator", "DivisionByZeroError", "DomainException", "EmptyIterator", "ErrorException", "Exception", "FilesystemIterator", "FilterIterator", "GlobIterator", "InfiniteIterator", "InvalidArgumentException", "IteratorIterator", "LengthException", "LimitIterator", "LogicException", "MultipleIterator", "NoRewindIterator", "OutOfBoundsException", "OutOfRangeException", "OuterIterator", "OverflowException", "ParentIterator", "ParseError", "RangeException", "RecursiveArrayIterator", "RecursiveCachingIterator", "RecursiveCallbackFilterIterator", "RecursiveDirectoryIterator", "RecursiveFilterIterator", "RecursiveIterator", "RecursiveIteratorIterator", "RecursiveRegexIterator", "RecursiveTreeIterator", "RegexIterator", "RuntimeException", "SeekableIterator", "SplDoublyLinkedList", "SplFileInfo", "SplFileObject", "SplFixedArray", "SplHeap", "SplMaxHeap", "SplMinHeap", "SplObjectStorage", "SplObserver", "SplPriorityQueue", "SplQueue", "SplStack", "SplSubject", "SplTempFileObject", "TypeError", "UnderflowException", "UnexpectedValueException", "UnhandledMatchError",
      // Reserved interfaces:
      // <https://www.php.net/manual/en/reserved.interfaces.php>
      "ArrayAccess", "BackedEnum", "Closure", "Fiber", "Generator", "Iterator", "IteratorAggregate", "Serializable", "Stringable", "Throwable", "Traversable", "UnitEnum", "WeakReference", "WeakMap",
      // Reserved classes:
      // <https://www.php.net/manual/en/reserved.classes.php>
      "Directory", "__PHP_Incomplete_Class", "parent", "php_user_filter", "self", "static", "stdClass"];

      /** Dual-case keywords
       *
       * ["then","FILE"] =>
       *     ["then", "THEN", "FILE", "file"]
       *
       * @param {string[]} items */
      const dualCase = items => {
        /** @type string[] */
        const result = [];
        items.forEach(item => {
          result.push(item);
          if (item.toLowerCase() === item) {
            result.push(item.toUpperCase());
          } else {
            result.push(item.toLowerCase());
          }
        });
        return result;
      };
      const KEYWORDS = {
        keyword: KWS,
        literal: dualCase(LITERALS),
        built_in: BUILT_INS
      };

      /**
       * @param {string[]} items */
      const normalizeKeywords = items => {
        return items.map(item => {
          return item.replace(/\|\d+$/, "");
        });
      };
      const CONSTRUCTOR_CALL = {
        variants: [{
          match: [/new/, regex.concat(WHITESPACE, "+"),
          // to prevent built ins from being confused as the class constructor call
          regex.concat("(?!", normalizeKeywords(BUILT_INS).join("\\b|"), "\\b)"), PASCAL_CASE_CLASS_NAME_RE],
          scope: {
            1: "keyword",
            4: "title.class"
          }
        }]
      };
      const CONSTANT_REFERENCE = regex.concat(IDENT_RE, "\\b(?!\\()");
      const LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON = {
        variants: [{
          match: [regex.concat(/::/, regex.lookahead(/(?!class\b)/)), CONSTANT_REFERENCE],
          scope: {
            2: "variable.constant"
          }
        }, {
          match: [/::/, /class/],
          scope: {
            2: "variable.language"
          }
        }, {
          match: [PASCAL_CASE_CLASS_NAME_RE, regex.concat(/::/, regex.lookahead(/(?!class\b)/)), CONSTANT_REFERENCE],
          scope: {
            1: "title.class",
            3: "variable.constant"
          }
        }, {
          match: [PASCAL_CASE_CLASS_NAME_RE, regex.concat("::", regex.lookahead(/(?!class\b)/))],
          scope: {
            1: "title.class"
          }
        }, {
          match: [PASCAL_CASE_CLASS_NAME_RE, /::/, /class/],
          scope: {
            1: "title.class",
            3: "variable.language"
          }
        }]
      };
      const NAMED_ARGUMENT = {
        scope: 'attr',
        match: regex.concat(IDENT_RE, regex.lookahead(':'), regex.lookahead(/(?!::)/))
      };
      const PARAMS_MODE = {
        relevance: 0,
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS,
        contains: [NAMED_ARGUMENT, VARIABLE, LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON, hljs.C_BLOCK_COMMENT_MODE, STRING, NUMBER, CONSTRUCTOR_CALL]
      };
      const FUNCTION_INVOKE = {
        relevance: 0,
        match: [/\b/,
        // to prevent keywords from being confused as the function title
        regex.concat("(?!fn\\b|function\\b|", normalizeKeywords(KWS).join("\\b|"), "|", normalizeKeywords(BUILT_INS).join("\\b|"), "\\b)"), IDENT_RE, regex.concat(WHITESPACE, "*"), regex.lookahead(/(?=\()/)],
        scope: {
          3: "title.function.invoke"
        },
        contains: [PARAMS_MODE]
      };
      PARAMS_MODE.contains.push(FUNCTION_INVOKE);
      const ATTRIBUTE_CONTAINS = [NAMED_ARGUMENT, LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON, hljs.C_BLOCK_COMMENT_MODE, STRING, NUMBER, CONSTRUCTOR_CALL];
      const ATTRIBUTES = {
        begin: regex.concat(/#\[\s*/, PASCAL_CASE_CLASS_NAME_RE),
        beginScope: "meta",
        end: /]/,
        endScope: "meta",
        keywords: {
          literal: LITERALS,
          keyword: ['new', 'array']
        },
        contains: [{
          begin: /\[/,
          end: /]/,
          keywords: {
            literal: LITERALS,
            keyword: ['new', 'array']
          },
          contains: ['self', ...ATTRIBUTE_CONTAINS]
        }, ...ATTRIBUTE_CONTAINS, {
          scope: 'meta',
          match: PASCAL_CASE_CLASS_NAME_RE
        }]
      };
      return {
        case_insensitive: false,
        keywords: KEYWORDS,
        contains: [ATTRIBUTES, hljs.HASH_COMMENT_MODE, hljs.COMMENT('//', '$'), hljs.COMMENT('/\\*', '\\*/', {
          contains: [{
            scope: 'doctag',
            match: '@[A-Za-z]+'
          }]
        }), {
          match: /__halt_compiler\(\);/,
          keywords: '__halt_compiler',
          starts: {
            scope: "comment",
            end: hljs.MATCH_NOTHING_RE,
            contains: [{
              match: /\?>/,
              scope: "meta",
              endsParent: true
            }]
          }
        }, PREPROCESSOR, {
          scope: 'variable.language',
          match: /\$this\b/
        }, VARIABLE, FUNCTION_INVOKE, LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON, {
          match: [/const/, /\s/, IDENT_RE],
          scope: {
            1: "keyword",
            3: "variable.constant"
          }
        }, CONSTRUCTOR_CALL, {
          scope: 'function',
          relevance: 0,
          beginKeywords: 'fn function',
          end: /[;{]/,
          excludeEnd: true,
          illegal: '[$%\\[]',
          contains: [{
            beginKeywords: 'use'
          }, hljs.UNDERSCORE_TITLE_MODE, {
            begin: '=>',
            // No markup, just a relevance booster
            endsParent: true
          }, {
            scope: 'params',
            begin: '\\(',
            end: '\\)',
            excludeBegin: true,
            excludeEnd: true,
            keywords: KEYWORDS,
            contains: ['self', VARIABLE, LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON, hljs.C_BLOCK_COMMENT_MODE, STRING, NUMBER]
          }]
        }, {
          scope: 'class',
          variants: [{
            beginKeywords: "enum",
            illegal: /[($"]/
          }, {
            beginKeywords: "class interface trait",
            illegal: /[:($"]/
          }],
          relevance: 0,
          end: /\{/,
          excludeEnd: true,
          contains: [{
            beginKeywords: 'extends implements'
          }, hljs.UNDERSCORE_TITLE_MODE]
        },
        // both use and namespace still use "old style" rules (vs multi-match)
        // because the namespace name can include `\` and we still want each
        // element to be treated as its own *individual* title
        {
          beginKeywords: 'namespace',
          relevance: 0,
          end: ';',
          illegal: /[.']/,
          contains: [hljs.inherit(hljs.UNDERSCORE_TITLE_MODE, {
            scope: "title.class"
          })]
        }, {
          beginKeywords: 'use',
          relevance: 0,
          end: ';',
          contains: [
          // TODO: title.function vs title.class
          {
            match: /\b(as|const|function)\b/,
            scope: "keyword"
          },
          // TODO: could be title.class or title.function
          hljs.UNDERSCORE_TITLE_MODE]
        }, STRING, NUMBER]
      };
    }
    php_1 = php;
    return php_1;
  }

  /*
  Language: PHP Template
  Requires: xml.js, php.js
  Author: Josh Goebel <hello@joshgoebel.com>
  Website: https://www.php.net
  Category: common
  */
  var phpTemplate_1;
  var hasRequiredPhpTemplate;
  function requirePhpTemplate() {
    if (hasRequiredPhpTemplate) return phpTemplate_1;
    hasRequiredPhpTemplate = 1;
    function phpTemplate(hljs) {
      return {
        name: "PHP template",
        subLanguage: 'xml',
        contains: [{
          begin: /<\?(php|=)?/,
          end: /\?>/,
          subLanguage: 'php',
          contains: [
          // We don't want the php closing tag ?> to close the PHP block when
          // inside any of the following blocks:
          {
            begin: '/\\*',
            end: '\\*/',
            skip: true
          }, {
            begin: 'b"',
            end: '"',
            skip: true
          }, {
            begin: 'b\'',
            end: '\'',
            skip: true
          }, hljs.inherit(hljs.APOS_STRING_MODE, {
            illegal: null,
            className: null,
            contains: null,
            skip: true
          }), hljs.inherit(hljs.QUOTE_STRING_MODE, {
            illegal: null,
            className: null,
            contains: null,
            skip: true
          })]
        }]
      };
    }
    phpTemplate_1 = phpTemplate;
    return phpTemplate_1;
  }

  /*
  Language: Plain text
  Author: Egor Rogov (e.rogov@postgrespro.ru)
  Description: Plain text without any highlighting.
  Category: common
  */
  var plaintext_1;
  var hasRequiredPlaintext;
  function requirePlaintext() {
    if (hasRequiredPlaintext) return plaintext_1;
    hasRequiredPlaintext = 1;
    function plaintext(hljs) {
      return {
        name: 'Plain text',
        aliases: ['text', 'txt'],
        disableAutodetect: true
      };
    }
    plaintext_1 = plaintext;
    return plaintext_1;
  }

  /*
  Language: Python
  Description: Python is an interpreted, object-oriented, high-level programming language with dynamic semantics.
  Website: https://www.python.org
  Category: common
  */
  var python_1;
  var hasRequiredPython;
  function requirePython() {
    if (hasRequiredPython) return python_1;
    hasRequiredPython = 1;
    function python(hljs) {
      const regex = hljs.regex;
      const IDENT_RE = /[\p{XID_Start}_]\p{XID_Continue}*/u;
      const RESERVED_WORDS = ['and', 'as', 'assert', 'async', 'await', 'break', 'case', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'match', 'nonlocal|10', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'];
      const BUILT_INS = ['__import__', 'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'breakpoint', 'bytearray', 'bytes', 'callable', 'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance', 'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property', 'range', 'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip'];
      const LITERALS = ['__debug__', 'Ellipsis', 'False', 'None', 'NotImplemented', 'True'];

      // https://docs.python.org/3/library/typing.html
      // TODO: Could these be supplemented by a CamelCase matcher in certain
      // contexts, leaving these remaining only for relevance hinting?
      const TYPES = ["Any", "Callable", "Coroutine", "Dict", "List", "Literal", "Generic", "Optional", "Sequence", "Set", "Tuple", "Type", "Union"];
      const KEYWORDS = {
        $pattern: /[A-Za-z]\w+|__\w+__/,
        keyword: RESERVED_WORDS,
        built_in: BUILT_INS,
        literal: LITERALS,
        type: TYPES
      };
      const PROMPT = {
        className: 'meta',
        begin: /^(>>>|\.\.\.) /
      };
      const SUBST = {
        className: 'subst',
        begin: /\{/,
        end: /\}/,
        keywords: KEYWORDS,
        illegal: /#/
      };
      const LITERAL_BRACKET = {
        begin: /\{\{/,
        relevance: 0
      };
      const STRING = {
        className: 'string',
        contains: [hljs.BACKSLASH_ESCAPE],
        variants: [{
          begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
          end: /'''/,
          contains: [hljs.BACKSLASH_ESCAPE, PROMPT],
          relevance: 10
        }, {
          begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
          end: /"""/,
          contains: [hljs.BACKSLASH_ESCAPE, PROMPT],
          relevance: 10
        }, {
          begin: /([fF][rR]|[rR][fF]|[fF])'''/,
          end: /'''/,
          contains: [hljs.BACKSLASH_ESCAPE, PROMPT, LITERAL_BRACKET, SUBST]
        }, {
          begin: /([fF][rR]|[rR][fF]|[fF])"""/,
          end: /"""/,
          contains: [hljs.BACKSLASH_ESCAPE, PROMPT, LITERAL_BRACKET, SUBST]
        }, {
          begin: /([uU]|[rR])'/,
          end: /'/,
          relevance: 10
        }, {
          begin: /([uU]|[rR])"/,
          end: /"/,
          relevance: 10
        }, {
          begin: /([bB]|[bB][rR]|[rR][bB])'/,
          end: /'/
        }, {
          begin: /([bB]|[bB][rR]|[rR][bB])"/,
          end: /"/
        }, {
          begin: /([fF][rR]|[rR][fF]|[fF])'/,
          end: /'/,
          contains: [hljs.BACKSLASH_ESCAPE, LITERAL_BRACKET, SUBST]
        }, {
          begin: /([fF][rR]|[rR][fF]|[fF])"/,
          end: /"/,
          contains: [hljs.BACKSLASH_ESCAPE, LITERAL_BRACKET, SUBST]
        }, hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE]
      };

      // https://docs.python.org/3.9/reference/lexical_analysis.html#numeric-literals
      const digitpart = '[0-9](_?[0-9])*';
      const pointfloat = `(\\b(${digitpart}))?\\.(${digitpart})|\\b(${digitpart})\\.`;
      // Whitespace after a number (or any lexical token) is needed only if its absence
      // would change the tokenization
      // https://docs.python.org/3.9/reference/lexical_analysis.html#whitespace-between-tokens
      // We deviate slightly, requiring a word boundary or a keyword
      // to avoid accidentally recognizing *prefixes* (e.g., `0` in `0x41` or `08` or `0__1`)
      const lookahead = `\\b|${RESERVED_WORDS.join('|')}`;
      const NUMBER = {
        className: 'number',
        relevance: 0,
        variants: [
        // exponentfloat, pointfloat
        // https://docs.python.org/3.9/reference/lexical_analysis.html#floating-point-literals
        // optionally imaginary
        // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
        // Note: no leading \b because floats can start with a decimal point
        // and we don't want to mishandle e.g. `fn(.5)`,
        // no trailing \b for pointfloat because it can end with a decimal point
        // and we don't want to mishandle e.g. `0..hex()`; this should be safe
        // because both MUST contain a decimal point and so cannot be confused with
        // the interior part of an identifier
        {
          begin: `(\\b(${digitpart})|(${pointfloat}))[eE][+-]?(${digitpart})[jJ]?(?=${lookahead})`
        }, {
          begin: `(${pointfloat})[jJ]?`
        },
        // decinteger, bininteger, octinteger, hexinteger
        // https://docs.python.org/3.9/reference/lexical_analysis.html#integer-literals
        // optionally "long" in Python 2
        // https://docs.python.org/2.7/reference/lexical_analysis.html#integer-and-long-integer-literals
        // decinteger is optionally imaginary
        // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
        {
          begin: `\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${lookahead})`
        }, {
          begin: `\\b0[bB](_?[01])+[lL]?(?=${lookahead})`
        }, {
          begin: `\\b0[oO](_?[0-7])+[lL]?(?=${lookahead})`
        }, {
          begin: `\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${lookahead})`
        },
        // imagnumber (digitpart-based)
        // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
        {
          begin: `\\b(${digitpart})[jJ](?=${lookahead})`
        }]
      };
      const COMMENT_TYPE = {
        className: "comment",
        begin: regex.lookahead(/# type:/),
        end: /$/,
        keywords: KEYWORDS,
        contains: [{
          // prevent keywords from coloring `type`
          begin: /# type:/
        },
        // comment within a datatype comment includes no keywords
        {
          begin: /#/,
          end: /\b\B/,
          endsWithParent: true
        }]
      };
      const PARAMS = {
        className: 'params',
        variants: [
        // Exclude params in functions without params
        {
          className: "",
          begin: /\(\s*\)/,
          skip: true
        }, {
          begin: /\(/,
          end: /\)/,
          excludeBegin: true,
          excludeEnd: true,
          keywords: KEYWORDS,
          contains: ['self', PROMPT, NUMBER, STRING, hljs.HASH_COMMENT_MODE]
        }]
      };
      SUBST.contains = [STRING, NUMBER, PROMPT];
      return {
        name: 'Python',
        aliases: ['py', 'gyp', 'ipython'],
        unicodeRegex: true,
        keywords: KEYWORDS,
        illegal: /(<\/|\?)|=>/,
        contains: [PROMPT, NUMBER, {
          // very common convention
          begin: /\bself\b/
        }, {
          // eat "if" prior to string so that it won't accidentally be
          // labeled as an f-string
          beginKeywords: "if",
          relevance: 0
        }, STRING, COMMENT_TYPE, hljs.HASH_COMMENT_MODE, {
          match: [/\bdef/, /\s+/, IDENT_RE],
          scope: {
            1: "keyword",
            3: "title.function"
          },
          contains: [PARAMS]
        }, {
          variants: [{
            match: [/\bclass/, /\s+/, IDENT_RE, /\s*/, /\(\s*/, IDENT_RE, /\s*\)/]
          }, {
            match: [/\bclass/, /\s+/, IDENT_RE]
          }],
          scope: {
            1: "keyword",
            3: "title.class",
            6: "title.class.inherited"
          }
        }, {
          className: 'meta',
          begin: /^[\t ]*@/,
          end: /(?=#)|$/,
          contains: [NUMBER, PARAMS, STRING]
        }]
      };
    }
    python_1 = python;
    return python_1;
  }

  /*
  Language: Python REPL
  Requires: python.js
  Author: Josh Goebel <hello@joshgoebel.com>
  Category: common
  */
  var pythonRepl_1;
  var hasRequiredPythonRepl;
  function requirePythonRepl() {
    if (hasRequiredPythonRepl) return pythonRepl_1;
    hasRequiredPythonRepl = 1;
    function pythonRepl(hljs) {
      return {
        aliases: ['pycon'],
        contains: [{
          className: 'meta.prompt',
          starts: {
            // a space separates the REPL prefix from the actual code
            // this is purely for cleaner HTML output
            end: / |$/,
            starts: {
              end: '$',
              subLanguage: 'python'
            }
          },
          variants: [{
            begin: /^>>>(?=[ ]|$)/
          }, {
            begin: /^\.\.\.(?=[ ]|$)/
          }]
        }]
      };
    }
    pythonRepl_1 = pythonRepl;
    return pythonRepl_1;
  }

  /*
  Language: R
  Description: R is a free software environment for statistical computing and graphics.
  Author: Joe Cheng <joe@rstudio.org>
  Contributors: Konrad Rudolph <konrad.rudolph@gmail.com>
  Website: https://www.r-project.org
  Category: common,scientific
  */
  var r_1;
  var hasRequiredR;
  function requireR() {
    if (hasRequiredR) return r_1;
    hasRequiredR = 1;
    /** @type LanguageFn */
    function r(hljs) {
      const regex = hljs.regex;
      // Identifiers in R cannot start with `_`, but they can start with `.` if it
      // is not immediately followed by a digit.
      // R also supports quoted identifiers, which are near-arbitrary sequences
      // delimited by backticks (`…`), which may contain escape sequences. These are
      // handled in a separate mode. See `test/markup/r/names.txt` for examples.
      // FIXME: Support Unicode identifiers.
      const IDENT_RE = /(?:(?:[a-zA-Z]|\.[._a-zA-Z])[._a-zA-Z0-9]*)|\.(?!\d)/;
      const NUMBER_TYPES_RE = regex.either(
      // Special case: only hexadecimal binary powers can contain fractions
      /0[xX][0-9a-fA-F]+\.[0-9a-fA-F]*[pP][+-]?\d+i?/,
      // Hexadecimal numbers without fraction and optional binary power
      /0[xX][0-9a-fA-F]+(?:[pP][+-]?\d+)?[Li]?/,
      // Decimal numbers
      /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[Li]?/);
      const OPERATORS_RE = /[=!<>:]=|\|\||&&|:::?|<-|<<-|->>|->|\|>|[-+*\/?!$&|:<=>@^~]|\*\*/;
      const PUNCTUATION_RE = regex.either(/[()]/, /[{}]/, /\[\[/, /[[\]]/, /\\/, /,/);
      return {
        name: 'R',
        keywords: {
          $pattern: IDENT_RE,
          keyword: 'function if in break next repeat else for while',
          literal: 'NULL NA TRUE FALSE Inf NaN NA_integer_|10 NA_real_|10 ' + 'NA_character_|10 NA_complex_|10',
          built_in:
          // Builtin constants
          'LETTERS letters month.abb month.name pi T F '
          // Primitive functions
          // These are all the functions in `base` that are implemented as a
          // `.Primitive`, minus those functions that are also keywords.
          + 'abs acos acosh all any anyNA Arg as.call as.character ' + 'as.complex as.double as.environment as.integer as.logical ' + 'as.null.default as.numeric as.raw asin asinh atan atanh attr ' + 'attributes baseenv browser c call ceiling class Conj cos cosh ' + 'cospi cummax cummin cumprod cumsum digamma dim dimnames ' + 'emptyenv exp expression floor forceAndCall gamma gc.time ' + 'globalenv Im interactive invisible is.array is.atomic is.call ' + 'is.character is.complex is.double is.environment is.expression ' + 'is.finite is.function is.infinite is.integer is.language ' + 'is.list is.logical is.matrix is.na is.name is.nan is.null ' + 'is.numeric is.object is.pairlist is.raw is.recursive is.single ' + 'is.symbol lazyLoadDBfetch length lgamma list log max min ' + 'missing Mod names nargs nzchar oldClass on.exit pos.to..env ' + 'proc.time prod quote range Re rep retracemem return round ' + 'seq_along seq_len seq.int sign signif sin sinh sinpi sqrt ' + 'standardGeneric substitute sum switch tan tanh tanpi tracemem ' + 'trigamma trunc unclass untracemem UseMethod xtfrm'
        },
        contains: [
        // Roxygen comments
        hljs.COMMENT(/#'/, /$/, {
          contains: [{
            // Handle `@examples` separately to cause all subsequent code
            // until the next `@`-tag on its own line to be kept as-is,
            // preventing highlighting. This code is example R code, so nested
            // doctags shouldn’t be treated as such. See
            // `test/markup/r/roxygen.txt` for an example.
            scope: 'doctag',
            match: /@examples/,
            starts: {
              end: regex.lookahead(regex.either(
              // end if another doc comment
              /\n^#'\s*(?=@[a-zA-Z]+)/,
              // or a line with no comment
              /\n^(?!#')/)),
              endsParent: true
            }
          }, {
            // Handle `@param` to highlight the parameter name following
            // after.
            scope: 'doctag',
            begin: '@param',
            end: /$/,
            contains: [{
              scope: 'variable',
              variants: [{
                match: IDENT_RE
              }, {
                match: /`(?:\\.|[^`\\])+`/
              }],
              endsParent: true
            }]
          }, {
            scope: 'doctag',
            match: /@[a-zA-Z]+/
          }, {
            scope: 'keyword',
            match: /\\[a-zA-Z]+/
          }]
        }), hljs.HASH_COMMENT_MODE, {
          scope: 'string',
          contains: [hljs.BACKSLASH_ESCAPE],
          variants: [hljs.END_SAME_AS_BEGIN({
            begin: /[rR]"(-*)\(/,
            end: /\)(-*)"/
          }), hljs.END_SAME_AS_BEGIN({
            begin: /[rR]"(-*)\{/,
            end: /\}(-*)"/
          }), hljs.END_SAME_AS_BEGIN({
            begin: /[rR]"(-*)\[/,
            end: /\](-*)"/
          }), hljs.END_SAME_AS_BEGIN({
            begin: /[rR]'(-*)\(/,
            end: /\)(-*)'/
          }), hljs.END_SAME_AS_BEGIN({
            begin: /[rR]'(-*)\{/,
            end: /\}(-*)'/
          }), hljs.END_SAME_AS_BEGIN({
            begin: /[rR]'(-*)\[/,
            end: /\](-*)'/
          }), {
            begin: '"',
            end: '"',
            relevance: 0
          }, {
            begin: "'",
            end: "'",
            relevance: 0
          }]
        },
        // Matching numbers immediately following punctuation and operators is
        // tricky since we need to look at the character ahead of a number to
        // ensure the number is not part of an identifier, and we cannot use
        // negative look-behind assertions. So instead we explicitly handle all
        // possible combinations of (operator|punctuation), number.
        // TODO: replace with negative look-behind when available
        // { begin: /(?<![a-zA-Z0-9._])0[xX][0-9a-fA-F]+\.[0-9a-fA-F]*[pP][+-]?\d+i?/ },
        // { begin: /(?<![a-zA-Z0-9._])0[xX][0-9a-fA-F]+([pP][+-]?\d+)?[Li]?/ },
        // { begin: /(?<![a-zA-Z0-9._])(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?[Li]?/ }
        {
          relevance: 0,
          variants: [{
            scope: {
              1: 'operator',
              2: 'number'
            },
            match: [OPERATORS_RE, NUMBER_TYPES_RE]
          }, {
            scope: {
              1: 'operator',
              2: 'number'
            },
            match: [/%[^%]*%/, NUMBER_TYPES_RE]
          }, {
            scope: {
              1: 'punctuation',
              2: 'number'
            },
            match: [PUNCTUATION_RE, NUMBER_TYPES_RE]
          }, {
            scope: {
              2: 'number'
            },
            match: [/[^a-zA-Z0-9._]|^/,
            // not part of an identifier, or start of document
            NUMBER_TYPES_RE]
          }]
        },
        // Operators/punctuation when they're not directly followed by numbers
        {
          // Relevance boost for the most common assignment form.
          scope: {
            3: 'operator'
          },
          match: [IDENT_RE, /\s+/, /<-/, /\s+/]
        }, {
          scope: 'operator',
          relevance: 0,
          variants: [{
            match: OPERATORS_RE
          }, {
            match: /%[^%]*%/
          }]
        }, {
          scope: 'punctuation',
          relevance: 0,
          match: PUNCTUATION_RE
        }, {
          // Escaped identifier
          begin: '`',
          end: '`',
          contains: [{
            begin: /\\./
          }]
        }]
      };
    }
    r_1 = r;
    return r_1;
  }

  /*
  Language: Rust
  Author: Andrey Vlasovskikh <andrey.vlasovskikh@gmail.com>
  Contributors: Roman Shmatov <romanshmatov@gmail.com>, Kasper Andersen <kma_untrusted@protonmail.com>
  Website: https://www.rust-lang.org
  Category: common, system
  */
  var rust_1;
  var hasRequiredRust;
  function requireRust() {
    if (hasRequiredRust) return rust_1;
    hasRequiredRust = 1;
    /** @type LanguageFn */
    function rust(hljs) {
      const regex = hljs.regex;
      const FUNCTION_INVOKE = {
        className: "title.function.invoke",
        relevance: 0,
        begin: regex.concat(/\b/, /(?!let\b)/, hljs.IDENT_RE, regex.lookahead(/\s*\(/))
      };
      const NUMBER_SUFFIX = '([ui](8|16|32|64|128|size)|f(32|64))\?';
      const KEYWORDS = ["abstract", "as", "async", "await", "become", "box", "break", "const", "continue", "crate", "do", "dyn", "else", "enum", "extern", "false", "final", "fn", "for", "if", "impl", "in", "let", "loop", "macro", "match", "mod", "move", "mut", "override", "priv", "pub", "ref", "return", "self", "Self", "static", "struct", "super", "trait", "true", "try", "type", "typeof", "unsafe", "unsized", "use", "virtual", "where", "while", "yield"];
      const LITERALS = ["true", "false", "Some", "None", "Ok", "Err"];
      const BUILTINS = [
      // functions
      'drop ',
      // traits
      "Copy", "Send", "Sized", "Sync", "Drop", "Fn", "FnMut", "FnOnce", "ToOwned", "Clone", "Debug", "PartialEq", "PartialOrd", "Eq", "Ord", "AsRef", "AsMut", "Into", "From", "Default", "Iterator", "Extend", "IntoIterator", "DoubleEndedIterator", "ExactSizeIterator", "SliceConcatExt", "ToString",
      // macros
      "assert!", "assert_eq!", "bitflags!", "bytes!", "cfg!", "col!", "concat!", "concat_idents!", "debug_assert!", "debug_assert_eq!", ".env!", "panic!", "file!", "format!", "format_args!", "include_bytes!", "include_str!", "line!", "local_data_key!", "module_path!", "option_env!", "print!", "println!", "select!", "stringify!", "try!", "unimplemented!", "unreachable!", "vec!", "write!", "writeln!", "macro_rules!", "assert_ne!", "debug_assert_ne!"];
      const TYPES = ["i8", "i16", "i32", "i64", "i128", "isize", "u8", "u16", "u32", "u64", "u128", "usize", "f32", "f64", "str", "char", "bool", "Box", "Option", "Result", "String", "Vec"];
      return {
        name: 'Rust',
        aliases: ['rs'],
        keywords: {
          $pattern: hljs.IDENT_RE + '!?',
          type: TYPES,
          keyword: KEYWORDS,
          literal: LITERALS,
          built_in: BUILTINS
        },
        illegal: '</',
        contains: [hljs.C_LINE_COMMENT_MODE, hljs.COMMENT('/\\*', '\\*/', {
          contains: ['self']
        }), hljs.inherit(hljs.QUOTE_STRING_MODE, {
          begin: /b?"/,
          illegal: null
        }), {
          className: 'string',
          variants: [{
            begin: /b?r(#*)"(.|\n)*?"\1(?!#)/
          }, {
            begin: /b?'\\?(x\w{2}|u\w{4}|U\w{8}|.)'/
          }]
        }, {
          className: 'symbol',
          begin: /'[a-zA-Z_][a-zA-Z0-9_]*/
        }, {
          className: 'number',
          variants: [{
            begin: '\\b0b([01_]+)' + NUMBER_SUFFIX
          }, {
            begin: '\\b0o([0-7_]+)' + NUMBER_SUFFIX
          }, {
            begin: '\\b0x([A-Fa-f0-9_]+)' + NUMBER_SUFFIX
          }, {
            begin: '\\b(\\d[\\d_]*(\\.[0-9_]+)?([eE][+-]?[0-9_]+)?)' + NUMBER_SUFFIX
          }],
          relevance: 0
        }, {
          begin: [/fn/, /\s+/, hljs.UNDERSCORE_IDENT_RE],
          className: {
            1: "keyword",
            3: "title.function"
          }
        }, {
          className: 'meta',
          begin: '#!?\\[',
          end: '\\]',
          contains: [{
            className: 'string',
            begin: /"/,
            end: /"/
          }]
        }, {
          begin: [/let/, /\s+/, /(?:mut\s+)?/, hljs.UNDERSCORE_IDENT_RE],
          className: {
            1: "keyword",
            3: "keyword",
            4: "variable"
          }
        },
        // must come before impl/for rule later
        {
          begin: [/for/, /\s+/, hljs.UNDERSCORE_IDENT_RE, /\s+/, /in/],
          className: {
            1: "keyword",
            3: "variable",
            5: "keyword"
          }
        }, {
          begin: [/type/, /\s+/, hljs.UNDERSCORE_IDENT_RE],
          className: {
            1: "keyword",
            3: "title.class"
          }
        }, {
          begin: [/(?:trait|enum|struct|union|impl|for)/, /\s+/, hljs.UNDERSCORE_IDENT_RE],
          className: {
            1: "keyword",
            3: "title.class"
          }
        }, {
          begin: hljs.IDENT_RE + '::',
          keywords: {
            keyword: "Self",
            built_in: BUILTINS,
            type: TYPES
          }
        }, {
          className: "punctuation",
          begin: '->'
        }, FUNCTION_INVOKE]
      };
    }
    rust_1 = rust;
    return rust_1;
  }

  var scss_1;
  var hasRequiredScss;
  function requireScss() {
    if (hasRequiredScss) return scss_1;
    hasRequiredScss = 1;
    const MODES = hljs => {
      return {
        IMPORTANT: {
          scope: 'meta',
          begin: '!important'
        },
        BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
        HEXCOLOR: {
          scope: 'number',
          begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
        },
        FUNCTION_DISPATCH: {
          className: "built_in",
          begin: /[\w-]+(?=\()/
        },
        ATTRIBUTE_SELECTOR_MODE: {
          scope: 'selector-attr',
          begin: /\[/,
          end: /\]/,
          illegal: '$',
          contains: [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE]
        },
        CSS_NUMBER_MODE: {
          scope: 'number',
          begin: hljs.NUMBER_RE + '(' + '%|em|ex|ch|rem' + '|vw|vh|vmin|vmax' + '|cm|mm|in|pt|pc|px' + '|deg|grad|rad|turn' + '|s|ms' + '|Hz|kHz' + '|dpi|dpcm|dppx' + ')?',
          relevance: 0
        },
        CSS_VARIABLE: {
          className: "attr",
          begin: /--[A-Za-z][A-Za-z0-9_-]*/
        }
      };
    };
    const TAGS = ['a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'blockquote', 'body', 'button', 'canvas', 'caption', 'cite', 'code', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'mark', 'menu', 'nav', 'object', 'ol', 'p', 'q', 'quote', 'samp', 'section', 'span', 'strong', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'ul', 'var', 'video'];
    const MEDIA_FEATURES = ['any-hover', 'any-pointer', 'aspect-ratio', 'color', 'color-gamut', 'color-index', 'device-aspect-ratio', 'device-height', 'device-width', 'display-mode', 'forced-colors', 'grid', 'height', 'hover', 'inverted-colors', 'monochrome', 'orientation', 'overflow-block', 'overflow-inline', 'pointer', 'prefers-color-scheme', 'prefers-contrast', 'prefers-reduced-motion', 'prefers-reduced-transparency', 'resolution', 'scan', 'scripting', 'update', 'width',
    // TODO: find a better solution?
    'min-width', 'max-width', 'min-height', 'max-height'];

    // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
    const PSEUDO_CLASSES = ['active', 'any-link', 'blank', 'checked', 'current', 'default', 'defined', 'dir',
    // dir()
    'disabled', 'drop', 'empty', 'enabled', 'first', 'first-child', 'first-of-type', 'fullscreen', 'future', 'focus', 'focus-visible', 'focus-within', 'has',
    // has()
    'host',
    // host or host()
    'host-context',
    // host-context()
    'hover', 'indeterminate', 'in-range', 'invalid', 'is',
    // is()
    'lang',
    // lang()
    'last-child', 'last-of-type', 'left', 'link', 'local-link', 'not',
    // not()
    'nth-child',
    // nth-child()
    'nth-col',
    // nth-col()
    'nth-last-child',
    // nth-last-child()
    'nth-last-col',
    // nth-last-col()
    'nth-last-of-type',
    //nth-last-of-type()
    'nth-of-type',
    //nth-of-type()
    'only-child', 'only-of-type', 'optional', 'out-of-range', 'past', 'placeholder-shown', 'read-only', 'read-write', 'required', 'right', 'root', 'scope', 'target', 'target-within', 'user-invalid', 'valid', 'visited', 'where' // where()
    ];

    // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
    const PSEUDO_ELEMENTS = ['after', 'backdrop', 'before', 'cue', 'cue-region', 'first-letter', 'first-line', 'grammar-error', 'marker', 'part', 'placeholder', 'selection', 'slotted', 'spelling-error'];
    const ATTRIBUTES = ['align-content', 'align-items', 'align-self', 'all', 'animation', 'animation-delay', 'animation-direction', 'animation-duration', 'animation-fill-mode', 'animation-iteration-count', 'animation-name', 'animation-play-state', 'animation-timing-function', 'backface-visibility', 'background', 'background-attachment', 'background-blend-mode', 'background-clip', 'background-color', 'background-image', 'background-origin', 'background-position', 'background-repeat', 'background-size', 'block-size', 'border', 'border-block', 'border-block-color', 'border-block-end', 'border-block-end-color', 'border-block-end-style', 'border-block-end-width', 'border-block-start', 'border-block-start-color', 'border-block-start-style', 'border-block-start-width', 'border-block-style', 'border-block-width', 'border-bottom', 'border-bottom-color', 'border-bottom-left-radius', 'border-bottom-right-radius', 'border-bottom-style', 'border-bottom-width', 'border-collapse', 'border-color', 'border-image', 'border-image-outset', 'border-image-repeat', 'border-image-slice', 'border-image-source', 'border-image-width', 'border-inline', 'border-inline-color', 'border-inline-end', 'border-inline-end-color', 'border-inline-end-style', 'border-inline-end-width', 'border-inline-start', 'border-inline-start-color', 'border-inline-start-style', 'border-inline-start-width', 'border-inline-style', 'border-inline-width', 'border-left', 'border-left-color', 'border-left-style', 'border-left-width', 'border-radius', 'border-right', 'border-right-color', 'border-right-style', 'border-right-width', 'border-spacing', 'border-style', 'border-top', 'border-top-color', 'border-top-left-radius', 'border-top-right-radius', 'border-top-style', 'border-top-width', 'border-width', 'bottom', 'box-decoration-break', 'box-shadow', 'box-sizing', 'break-after', 'break-before', 'break-inside', 'caption-side', 'caret-color', 'clear', 'clip', 'clip-path', 'clip-rule', 'color', 'column-count', 'column-fill', 'column-gap', 'column-rule', 'column-rule-color', 'column-rule-style', 'column-rule-width', 'column-span', 'column-width', 'columns', 'contain', 'content', 'content-visibility', 'counter-increment', 'counter-reset', 'cue', 'cue-after', 'cue-before', 'cursor', 'direction', 'display', 'empty-cells', 'filter', 'flex', 'flex-basis', 'flex-direction', 'flex-flow', 'flex-grow', 'flex-shrink', 'flex-wrap', 'float', 'flow', 'font', 'font-display', 'font-family', 'font-feature-settings', 'font-kerning', 'font-language-override', 'font-size', 'font-size-adjust', 'font-smoothing', 'font-stretch', 'font-style', 'font-synthesis', 'font-variant', 'font-variant-caps', 'font-variant-east-asian', 'font-variant-ligatures', 'font-variant-numeric', 'font-variant-position', 'font-variation-settings', 'font-weight', 'gap', 'glyph-orientation-vertical', 'grid', 'grid-area', 'grid-auto-columns', 'grid-auto-flow', 'grid-auto-rows', 'grid-column', 'grid-column-end', 'grid-column-start', 'grid-gap', 'grid-row', 'grid-row-end', 'grid-row-start', 'grid-template', 'grid-template-areas', 'grid-template-columns', 'grid-template-rows', 'hanging-punctuation', 'height', 'hyphens', 'icon', 'image-orientation', 'image-rendering', 'image-resolution', 'ime-mode', 'inline-size', 'isolation', 'justify-content', 'left', 'letter-spacing', 'line-break', 'line-height', 'list-style', 'list-style-image', 'list-style-position', 'list-style-type', 'margin', 'margin-block', 'margin-block-end', 'margin-block-start', 'margin-bottom', 'margin-inline', 'margin-inline-end', 'margin-inline-start', 'margin-left', 'margin-right', 'margin-top', 'marks', 'mask', 'mask-border', 'mask-border-mode', 'mask-border-outset', 'mask-border-repeat', 'mask-border-slice', 'mask-border-source', 'mask-border-width', 'mask-clip', 'mask-composite', 'mask-image', 'mask-mode', 'mask-origin', 'mask-position', 'mask-repeat', 'mask-size', 'mask-type', 'max-block-size', 'max-height', 'max-inline-size', 'max-width', 'min-block-size', 'min-height', 'min-inline-size', 'min-width', 'mix-blend-mode', 'nav-down', 'nav-index', 'nav-left', 'nav-right', 'nav-up', 'none', 'normal', 'object-fit', 'object-position', 'opacity', 'order', 'orphans', 'outline', 'outline-color', 'outline-offset', 'outline-style', 'outline-width', 'overflow', 'overflow-wrap', 'overflow-x', 'overflow-y', 'padding', 'padding-block', 'padding-block-end', 'padding-block-start', 'padding-bottom', 'padding-inline', 'padding-inline-end', 'padding-inline-start', 'padding-left', 'padding-right', 'padding-top', 'page-break-after', 'page-break-before', 'page-break-inside', 'pause', 'pause-after', 'pause-before', 'perspective', 'perspective-origin', 'pointer-events', 'position', 'quotes', 'resize', 'rest', 'rest-after', 'rest-before', 'right', 'row-gap', 'scroll-margin', 'scroll-margin-block', 'scroll-margin-block-end', 'scroll-margin-block-start', 'scroll-margin-bottom', 'scroll-margin-inline', 'scroll-margin-inline-end', 'scroll-margin-inline-start', 'scroll-margin-left', 'scroll-margin-right', 'scroll-margin-top', 'scroll-padding', 'scroll-padding-block', 'scroll-padding-block-end', 'scroll-padding-block-start', 'scroll-padding-bottom', 'scroll-padding-inline', 'scroll-padding-inline-end', 'scroll-padding-inline-start', 'scroll-padding-left', 'scroll-padding-right', 'scroll-padding-top', 'scroll-snap-align', 'scroll-snap-stop', 'scroll-snap-type', 'scrollbar-color', 'scrollbar-gutter', 'scrollbar-width', 'shape-image-threshold', 'shape-margin', 'shape-outside', 'speak', 'speak-as', 'src',
    // @font-face
    'tab-size', 'table-layout', 'text-align', 'text-align-all', 'text-align-last', 'text-combine-upright', 'text-decoration', 'text-decoration-color', 'text-decoration-line', 'text-decoration-style', 'text-emphasis', 'text-emphasis-color', 'text-emphasis-position', 'text-emphasis-style', 'text-indent', 'text-justify', 'text-orientation', 'text-overflow', 'text-rendering', 'text-shadow', 'text-transform', 'text-underline-position', 'top', 'transform', 'transform-box', 'transform-origin', 'transform-style', 'transition', 'transition-delay', 'transition-duration', 'transition-property', 'transition-timing-function', 'unicode-bidi', 'vertical-align', 'visibility', 'voice-balance', 'voice-duration', 'voice-family', 'voice-pitch', 'voice-range', 'voice-rate', 'voice-stress', 'voice-volume', 'white-space', 'widows', 'width', 'will-change', 'word-break', 'word-spacing', 'word-wrap', 'writing-mode', 'z-index'
    // reverse makes sure longer attributes `font-weight` are matched fully
    // instead of getting false positives on say `font`
    ].reverse();

    /*
    Language: SCSS
    Description: Scss is an extension of the syntax of CSS.
    Author: Kurt Emch <kurt@kurtemch.com>
    Website: https://sass-lang.com
    Category: common, css, web
    */

    /** @type LanguageFn */
    function scss(hljs) {
      const modes = MODES(hljs);
      const PSEUDO_ELEMENTS$1 = PSEUDO_ELEMENTS;
      const PSEUDO_CLASSES$1 = PSEUDO_CLASSES;
      const AT_IDENTIFIER = '@[a-z-]+'; // @font-face
      const AT_MODIFIERS = "and or not only";
      const IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
      const VARIABLE = {
        className: 'variable',
        begin: '(\\$' + IDENT_RE + ')\\b',
        relevance: 0
      };
      return {
        name: 'SCSS',
        case_insensitive: true,
        illegal: '[=/|\']',
        contains: [hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE,
        // to recognize keyframe 40% etc which are outside the scope of our
        // attribute value mode
        modes.CSS_NUMBER_MODE, {
          className: 'selector-id',
          begin: '#[A-Za-z0-9_-]+',
          relevance: 0
        }, {
          className: 'selector-class',
          begin: '\\.[A-Za-z0-9_-]+',
          relevance: 0
        }, modes.ATTRIBUTE_SELECTOR_MODE, {
          className: 'selector-tag',
          begin: '\\b(' + TAGS.join('|') + ')\\b',
          // was there, before, but why?
          relevance: 0
        }, {
          className: 'selector-pseudo',
          begin: ':(' + PSEUDO_CLASSES$1.join('|') + ')'
        }, {
          className: 'selector-pseudo',
          begin: ':(:)?(' + PSEUDO_ELEMENTS$1.join('|') + ')'
        }, VARIABLE, {
          // pseudo-selector params
          begin: /\(/,
          end: /\)/,
          contains: [modes.CSS_NUMBER_MODE]
        }, modes.CSS_VARIABLE, {
          className: 'attribute',
          begin: '\\b(' + ATTRIBUTES.join('|') + ')\\b'
        }, {
          begin: '\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b'
        }, {
          begin: /:/,
          end: /[;}{]/,
          relevance: 0,
          contains: [modes.BLOCK_COMMENT, VARIABLE, modes.HEXCOLOR, modes.CSS_NUMBER_MODE, hljs.QUOTE_STRING_MODE, hljs.APOS_STRING_MODE, modes.IMPORTANT, modes.FUNCTION_DISPATCH]
        },
        // matching these here allows us to treat them more like regular CSS
        // rules so everything between the {} gets regular rule highlighting,
        // which is what we want for page and font-face
        {
          begin: '@(page|font-face)',
          keywords: {
            $pattern: AT_IDENTIFIER,
            keyword: '@page @font-face'
          }
        }, {
          begin: '@',
          end: '[{;]',
          returnBegin: true,
          keywords: {
            $pattern: /[a-z-]+/,
            keyword: AT_MODIFIERS,
            attribute: MEDIA_FEATURES.join(" ")
          },
          contains: [{
            begin: AT_IDENTIFIER,
            className: "keyword"
          }, {
            begin: /[a-z-]+(?=:)/,
            className: "attribute"
          }, VARIABLE, hljs.QUOTE_STRING_MODE, hljs.APOS_STRING_MODE, modes.HEXCOLOR, modes.CSS_NUMBER_MODE]
        }, modes.FUNCTION_DISPATCH]
      };
    }
    scss_1 = scss;
    return scss_1;
  }

  /*
  Language: Shell Session
  Requires: bash.js
  Author: TSUYUSATO Kitsune <make.just.on@gmail.com>
  Category: common
  Audit: 2020
  */
  var shell_1;
  var hasRequiredShell;
  function requireShell() {
    if (hasRequiredShell) return shell_1;
    hasRequiredShell = 1;
    /** @type LanguageFn */
    function shell(hljs) {
      return {
        name: 'Shell Session',
        aliases: ['console', 'shellsession'],
        contains: [{
          className: 'meta.prompt',
          // We cannot add \s (spaces) in the regular expression otherwise it will be too broad and produce unexpected result.
          // For instance, in the following example, it would match "echo /path/to/home >" as a prompt:
          // echo /path/to/home > t.exe
          begin: /^\s{0,3}[/~\w\d[\]()@-]*[>%$#][ ]?/,
          starts: {
            end: /[^\\](?=\s*$)/,
            subLanguage: 'bash'
          }
        }]
      };
    }
    shell_1 = shell;
    return shell_1;
  }

  /*
   Language: SQL
   Website: https://en.wikipedia.org/wiki/SQL
   Category: common, database
   */
  var sql_1;
  var hasRequiredSql;
  function requireSql() {
    if (hasRequiredSql) return sql_1;
    hasRequiredSql = 1;
    /*
    	Goals:
    	SQL is intended to highlight basic/common SQL keywords and expressions
    	- If pretty much every single SQL server includes supports, then it's a canidate.
    - It is NOT intended to include tons of vendor specific keywords (Oracle, MySQL,
      PostgreSQL) although the list of data types is purposely a bit more expansive.
    - For more specific SQL grammars please see:
      - PostgreSQL and PL/pgSQL - core
      - T-SQL - https://github.com/highlightjs/highlightjs-tsql
      - sql_more (core)
    	 */

    function sql(hljs) {
      const regex = hljs.regex;
      const COMMENT_MODE = hljs.COMMENT('--', '$');
      const STRING = {
        className: 'string',
        variants: [{
          begin: /'/,
          end: /'/,
          contains: [{
            begin: /''/
          }]
        }]
      };
      const QUOTED_IDENTIFIER = {
        begin: /"/,
        end: /"/,
        contains: [{
          begin: /""/
        }]
      };
      const LITERALS = ["true", "false",
      // Not sure it's correct to call NULL literal, and clauses like IS [NOT] NULL look strange that way.
      // "null",
      "unknown"];
      const MULTI_WORD_TYPES = ["double precision", "large object", "with timezone", "without timezone"];
      const TYPES = ['bigint', 'binary', 'blob', 'boolean', 'char', 'character', 'clob', 'date', 'dec', 'decfloat', 'decimal', 'float', 'int', 'integer', 'interval', 'nchar', 'nclob', 'national', 'numeric', 'real', 'row', 'smallint', 'time', 'timestamp', 'varchar', 'varying',
      // modifier (character varying)
      'varbinary'];
      const NON_RESERVED_WORDS = ["add", "asc", "collation", "desc", "final", "first", "last", "view"];

      // https://jakewheat.github.io/sql-overview/sql-2016-foundation-grammar.html#reserved-word
      const RESERVED_WORDS = ["abs", "acos", "all", "allocate", "alter", "and", "any", "are", "array", "array_agg", "array_max_cardinality", "as", "asensitive", "asin", "asymmetric", "at", "atan", "atomic", "authorization", "avg", "begin", "begin_frame", "begin_partition", "between", "bigint", "binary", "blob", "boolean", "both", "by", "call", "called", "cardinality", "cascaded", "case", "cast", "ceil", "ceiling", "char", "char_length", "character", "character_length", "check", "classifier", "clob", "close", "coalesce", "collate", "collect", "column", "commit", "condition", "connect", "constraint", "contains", "convert", "copy", "corr", "corresponding", "cos", "cosh", "count", "covar_pop", "covar_samp", "create", "cross", "cube", "cume_dist", "current", "current_catalog", "current_date", "current_default_transform_group", "current_path", "current_role", "current_row", "current_schema", "current_time", "current_timestamp", "current_path", "current_role", "current_transform_group_for_type", "current_user", "cursor", "cycle", "date", "day", "deallocate", "dec", "decimal", "decfloat", "declare", "default", "define", "delete", "dense_rank", "deref", "describe", "deterministic", "disconnect", "distinct", "double", "drop", "dynamic", "each", "element", "else", "empty", "end", "end_frame", "end_partition", "end-exec", "equals", "escape", "every", "except", "exec", "execute", "exists", "exp", "external", "extract", "false", "fetch", "filter", "first_value", "float", "floor", "for", "foreign", "frame_row", "free", "from", "full", "function", "fusion", "get", "global", "grant", "group", "grouping", "groups", "having", "hold", "hour", "identity", "in", "indicator", "initial", "inner", "inout", "insensitive", "insert", "int", "integer", "intersect", "intersection", "interval", "into", "is", "join", "json_array", "json_arrayagg", "json_exists", "json_object", "json_objectagg", "json_query", "json_table", "json_table_primitive", "json_value", "lag", "language", "large", "last_value", "lateral", "lead", "leading", "left", "like", "like_regex", "listagg", "ln", "local", "localtime", "localtimestamp", "log", "log10", "lower", "match", "match_number", "match_recognize", "matches", "max", "member", "merge", "method", "min", "minute", "mod", "modifies", "module", "month", "multiset", "national", "natural", "nchar", "nclob", "new", "no", "none", "normalize", "not", "nth_value", "ntile", "null", "nullif", "numeric", "octet_length", "occurrences_regex", "of", "offset", "old", "omit", "on", "one", "only", "open", "or", "order", "out", "outer", "over", "overlaps", "overlay", "parameter", "partition", "pattern", "per", "percent", "percent_rank", "percentile_cont", "percentile_disc", "period", "portion", "position", "position_regex", "power", "precedes", "precision", "prepare", "primary", "procedure", "ptf", "range", "rank", "reads", "real", "recursive", "ref", "references", "referencing", "regr_avgx", "regr_avgy", "regr_count", "regr_intercept", "regr_r2", "regr_slope", "regr_sxx", "regr_sxy", "regr_syy", "release", "result", "return", "returns", "revoke", "right", "rollback", "rollup", "row", "row_number", "rows", "running", "savepoint", "scope", "scroll", "search", "second", "seek", "select", "sensitive", "session_user", "set", "show", "similar", "sin", "sinh", "skip", "smallint", "some", "specific", "specifictype", "sql", "sqlexception", "sqlstate", "sqlwarning", "sqrt", "start", "static", "stddev_pop", "stddev_samp", "submultiset", "subset", "substring", "substring_regex", "succeeds", "sum", "symmetric", "system", "system_time", "system_user", "table", "tablesample", "tan", "tanh", "then", "time", "timestamp", "timezone_hour", "timezone_minute", "to", "trailing", "translate", "translate_regex", "translation", "treat", "trigger", "trim", "trim_array", "true", "truncate", "uescape", "union", "unique", "unknown", "unnest", "update", "upper", "user", "using", "value", "values", "value_of", "var_pop", "var_samp", "varbinary", "varchar", "varying", "versioning", "when", "whenever", "where", "width_bucket", "window", "with", "within", "without", "year"];

      // these are reserved words we have identified to be functions
      // and should only be highlighted in a dispatch-like context
      // ie, array_agg(...), etc.
      const RESERVED_FUNCTIONS = ["abs", "acos", "array_agg", "asin", "atan", "avg", "cast", "ceil", "ceiling", "coalesce", "corr", "cos", "cosh", "count", "covar_pop", "covar_samp", "cume_dist", "dense_rank", "deref", "element", "exp", "extract", "first_value", "floor", "json_array", "json_arrayagg", "json_exists", "json_object", "json_objectagg", "json_query", "json_table", "json_table_primitive", "json_value", "lag", "last_value", "lead", "listagg", "ln", "log", "log10", "lower", "max", "min", "mod", "nth_value", "ntile", "nullif", "percent_rank", "percentile_cont", "percentile_disc", "position", "position_regex", "power", "rank", "regr_avgx", "regr_avgy", "regr_count", "regr_intercept", "regr_r2", "regr_slope", "regr_sxx", "regr_sxy", "regr_syy", "row_number", "sin", "sinh", "sqrt", "stddev_pop", "stddev_samp", "substring", "substring_regex", "sum", "tan", "tanh", "translate", "translate_regex", "treat", "trim", "trim_array", "unnest", "upper", "value_of", "var_pop", "var_samp", "width_bucket"];

      // these functions can
      const POSSIBLE_WITHOUT_PARENS = ["current_catalog", "current_date", "current_default_transform_group", "current_path", "current_role", "current_schema", "current_transform_group_for_type", "current_user", "session_user", "system_time", "system_user", "current_time", "localtime", "current_timestamp", "localtimestamp"];

      // those exist to boost relevance making these very
      // "SQL like" keyword combos worth +1 extra relevance
      const COMBOS = ["create table", "insert into", "primary key", "foreign key", "not null", "alter table", "add constraint", "grouping sets", "on overflow", "character set", "respect nulls", "ignore nulls", "nulls first", "nulls last", "depth first", "breadth first"];
      const FUNCTIONS = RESERVED_FUNCTIONS;
      const KEYWORDS = [...RESERVED_WORDS, ...NON_RESERVED_WORDS].filter(keyword => {
        return !RESERVED_FUNCTIONS.includes(keyword);
      });
      const VARIABLE = {
        className: "variable",
        begin: /@[a-z0-9][a-z0-9_]*/
      };
      const OPERATOR = {
        className: "operator",
        begin: /[-+*/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?/,
        relevance: 0
      };
      const FUNCTION_CALL = {
        begin: regex.concat(/\b/, regex.either(...FUNCTIONS), /\s*\(/),
        relevance: 0,
        keywords: {
          built_in: FUNCTIONS
        }
      };

      // keywords with less than 3 letters are reduced in relevancy
      function reduceRelevancy(list, {
        exceptions,
        when
      } = {}) {
        const qualifyFn = when;
        exceptions = exceptions || [];
        return list.map(item => {
          if (item.match(/\|\d+$/) || exceptions.includes(item)) {
            return item;
          } else if (qualifyFn(item)) {
            return `${item}|0`;
          } else {
            return item;
          }
        });
      }
      return {
        name: 'SQL',
        case_insensitive: true,
        // does not include {} or HTML tags `</`
        illegal: /[{}]|<\//,
        keywords: {
          $pattern: /\b[\w\.]+/,
          keyword: reduceRelevancy(KEYWORDS, {
            when: x => x.length < 3
          }),
          literal: LITERALS,
          type: TYPES,
          built_in: POSSIBLE_WITHOUT_PARENS
        },
        contains: [{
          begin: regex.either(...COMBOS),
          relevance: 0,
          keywords: {
            $pattern: /[\w\.]+/,
            keyword: KEYWORDS.concat(COMBOS),
            literal: LITERALS,
            type: TYPES
          }
        }, {
          className: "type",
          begin: regex.either(...MULTI_WORD_TYPES)
        }, FUNCTION_CALL, VARIABLE, STRING, QUOTED_IDENTIFIER, hljs.C_NUMBER_MODE, hljs.C_BLOCK_COMMENT_MODE, COMMENT_MODE, OPERATOR]
      };
    }
    sql_1 = sql;
    return sql_1;
  }

  /**
   * @param {string} value
   * @returns {RegExp}
   * */
  var swift_1;
  var hasRequiredSwift;
  function requireSwift() {
    if (hasRequiredSwift) return swift_1;
    hasRequiredSwift = 1;
    /**
     * @param {RegExp | string } re
     * @returns {string}
     */
    function source(re) {
      if (!re) return null;
      if (typeof re === "string") return re;
      return re.source;
    }

    /**
     * @param {RegExp | string } re
     * @returns {string}
     */
    function lookahead(re) {
      return concat('(?=', re, ')');
    }

    /**
     * @param {...(RegExp | string) } args
     * @returns {string}
     */
    function concat(...args) {
      const joined = args.map(x => source(x)).join("");
      return joined;
    }

    /**
     * @param { Array<string | RegExp | Object> } args
     * @returns {object}
     */
    function stripOptionsFromArgs(args) {
      const opts = args[args.length - 1];
      if (typeof opts === 'object' && opts.constructor === Object) {
        args.splice(args.length - 1, 1);
        return opts;
      } else {
        return {};
      }
    }

    /** @typedef { {capture?: boolean} } RegexEitherOptions */

    /**
     * Any of the passed expresssions may match
     *
     * Creates a huge this | this | that | that match
     * @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
     * @returns {string}
     */
    function either(...args) {
      /** @type { object & {capture?: boolean} }  */
      const opts = stripOptionsFromArgs(args);
      const joined = '(' + (opts.capture ? "" : "?:") + args.map(x => source(x)).join("|") + ")";
      return joined;
    }
    const keywordWrapper = keyword => concat(/\b/, keyword, /\w$/.test(keyword) ? /\b/ : /\B/);

    // Keywords that require a leading dot.
    const dotKeywords = ['Protocol',
    // contextual
    'Type' // contextual
    ].map(keywordWrapper);

    // Keywords that may have a leading dot.
    const optionalDotKeywords = ['init', 'self'].map(keywordWrapper);

    // should register as keyword, not type
    const keywordTypes = ['Any', 'Self'];

    // Regular keywords and literals.
    const keywords = [
    // strings below will be fed into the regular `keywords` engine while regex
    // will result in additional modes being created to scan for those keywords to
    // avoid conflicts with other rules
    'actor', 'any',
    // contextual
    'associatedtype', 'async', 'await', /as\?/,
    // operator
    /as!/,
    // operator
    'as',
    // operator
    'break', 'case', 'catch', 'class', 'continue', 'convenience',
    // contextual
    'default', 'defer', 'deinit', 'didSet',
    // contextual
    'distributed', 'do', 'dynamic',
    // contextual
    'else', 'enum', 'extension', 'fallthrough', /fileprivate\(set\)/, 'fileprivate', 'final',
    // contextual
    'for', 'func', 'get',
    // contextual
    'guard', 'if', 'import', 'indirect',
    // contextual
    'infix',
    // contextual
    /init\?/, /init!/, 'inout', /internal\(set\)/, 'internal', 'in', 'is',
    // operator
    'isolated',
    // contextual
    'nonisolated',
    // contextual
    'lazy',
    // contextual
    'let', 'mutating',
    // contextual
    'nonmutating',
    // contextual
    /open\(set\)/,
    // contextual
    'open',
    // contextual
    'operator', 'optional',
    // contextual
    'override',
    // contextual
    'postfix',
    // contextual
    'precedencegroup', 'prefix',
    // contextual
    /private\(set\)/, 'private', 'protocol', /public\(set\)/, 'public', 'repeat', 'required',
    // contextual
    'rethrows', 'return', 'set',
    // contextual
    'some',
    // contextual
    'static', 'struct', 'subscript', 'super', 'switch', 'throws', 'throw', /try\?/,
    // operator
    /try!/,
    // operator
    'try',
    // operator
    'typealias', /unowned\(safe\)/,
    // contextual
    /unowned\(unsafe\)/,
    // contextual
    'unowned',
    // contextual
    'var', 'weak',
    // contextual
    'where', 'while', 'willSet' // contextual
    ];

    // NOTE: Contextual keywords are reserved only in specific contexts.
    // Ideally, these should be matched using modes to avoid false positives.

    // Literals.
    const literals = ['false', 'nil', 'true'];

    // Keywords used in precedence groups.
    const precedencegroupKeywords = ['assignment', 'associativity', 'higherThan', 'left', 'lowerThan', 'none', 'right'];

    // Keywords that start with a number sign (#).
    // #(un)available is handled separately.
    const numberSignKeywords = ['#colorLiteral', '#column', '#dsohandle', '#else', '#elseif', '#endif', '#error', '#file', '#fileID', '#fileLiteral', '#filePath', '#function', '#if', '#imageLiteral', '#keyPath', '#line', '#selector', '#sourceLocation', '#warn_unqualified_access', '#warning'];

    // Global functions in the Standard Library.
    const builtIns = ['abs', 'all', 'any', 'assert', 'assertionFailure', 'debugPrint', 'dump', 'fatalError', 'getVaList', 'isKnownUniquelyReferenced', 'max', 'min', 'numericCast', 'pointwiseMax', 'pointwiseMin', 'precondition', 'preconditionFailure', 'print', 'readLine', 'repeatElement', 'sequence', 'stride', 'swap', 'swift_unboxFromSwiftValueWithType', 'transcode', 'type', 'unsafeBitCast', 'unsafeDowncast', 'withExtendedLifetime', 'withUnsafeMutablePointer', 'withUnsafePointer', 'withVaList', 'withoutActuallyEscaping', 'zip'];

    // Valid first characters for operators.
    const operatorHead = either(/[/=\-+!*%<>&|^~?]/, /[\u00A1-\u00A7]/, /[\u00A9\u00AB]/, /[\u00AC\u00AE]/, /[\u00B0\u00B1]/, /[\u00B6\u00BB\u00BF\u00D7\u00F7]/, /[\u2016-\u2017]/, /[\u2020-\u2027]/, /[\u2030-\u203E]/, /[\u2041-\u2053]/, /[\u2055-\u205E]/, /[\u2190-\u23FF]/, /[\u2500-\u2775]/, /[\u2794-\u2BFF]/, /[\u2E00-\u2E7F]/, /[\u3001-\u3003]/, /[\u3008-\u3020]/, /[\u3030]/);

    // Valid characters for operators.
    const operatorCharacter = either(operatorHead, /[\u0300-\u036F]/, /[\u1DC0-\u1DFF]/, /[\u20D0-\u20FF]/, /[\uFE00-\uFE0F]/, /[\uFE20-\uFE2F]/
    // TODO: The following characters are also allowed, but the regex isn't supported yet.
    // /[\u{E0100}-\u{E01EF}]/u
    );

    // Valid operator.
    const operator = concat(operatorHead, operatorCharacter, '*');

    // Valid first characters for identifiers.
    const identifierHead = either(/[a-zA-Z_]/, /[\u00A8\u00AA\u00AD\u00AF\u00B2-\u00B5\u00B7-\u00BA]/, /[\u00BC-\u00BE\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/, /[\u0100-\u02FF\u0370-\u167F\u1681-\u180D\u180F-\u1DBF]/, /[\u1E00-\u1FFF]/, /[\u200B-\u200D\u202A-\u202E\u203F-\u2040\u2054\u2060-\u206F]/, /[\u2070-\u20CF\u2100-\u218F\u2460-\u24FF\u2776-\u2793]/, /[\u2C00-\u2DFF\u2E80-\u2FFF]/, /[\u3004-\u3007\u3021-\u302F\u3031-\u303F\u3040-\uD7FF]/, /[\uF900-\uFD3D\uFD40-\uFDCF\uFDF0-\uFE1F\uFE30-\uFE44]/, /[\uFE47-\uFEFE\uFF00-\uFFFD]/ // Should be /[\uFE47-\uFFFD]/, but we have to exclude FEFF.
    // The following characters are also allowed, but the regexes aren't supported yet.
    // /[\u{10000}-\u{1FFFD}\u{20000-\u{2FFFD}\u{30000}-\u{3FFFD}\u{40000}-\u{4FFFD}]/u,
    // /[\u{50000}-\u{5FFFD}\u{60000-\u{6FFFD}\u{70000}-\u{7FFFD}\u{80000}-\u{8FFFD}]/u,
    // /[\u{90000}-\u{9FFFD}\u{A0000-\u{AFFFD}\u{B0000}-\u{BFFFD}\u{C0000}-\u{CFFFD}]/u,
    // /[\u{D0000}-\u{DFFFD}\u{E0000-\u{EFFFD}]/u
    );

    // Valid characters for identifiers.
    const identifierCharacter = either(identifierHead, /\d/, /[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/);

    // Valid identifier.
    const identifier = concat(identifierHead, identifierCharacter, '*');

    // Valid type identifier.
    const typeIdentifier = concat(/[A-Z]/, identifierCharacter, '*');

    // Built-in attributes, which are highlighted as keywords.
    // @available is handled separately.
    const keywordAttributes = ['autoclosure', concat(/convention\(/, either('swift', 'block', 'c'), /\)/), 'discardableResult', 'dynamicCallable', 'dynamicMemberLookup', 'escaping', 'frozen', 'GKInspectable', 'IBAction', 'IBDesignable', 'IBInspectable', 'IBOutlet', 'IBSegueAction', 'inlinable', 'main', 'nonobjc', 'NSApplicationMain', 'NSCopying', 'NSManaged', concat(/objc\(/, identifier, /\)/), 'objc', 'objcMembers', 'propertyWrapper', 'requires_stored_property_inits', 'resultBuilder', 'testable', 'UIApplicationMain', 'unknown', 'usableFromInline'];

    // Contextual keywords used in @available and #(un)available.
    const availabilityKeywords = ['iOS', 'iOSApplicationExtension', 'macOS', 'macOSApplicationExtension', 'macCatalyst', 'macCatalystApplicationExtension', 'watchOS', 'watchOSApplicationExtension', 'tvOS', 'tvOSApplicationExtension', 'swift'];

    /*
    Language: Swift
    Description: Swift is a general-purpose programming language built using a modern approach to safety, performance, and software design patterns.
    Author: Steven Van Impe <steven.vanimpe@icloud.com>
    Contributors: Chris Eidhof <chris@eidhof.nl>, Nate Cook <natecook@gmail.com>, Alexander Lichter <manniL@gmx.net>, Richard Gibson <gibson042@github>
    Website: https://swift.org
    Category: common, system
    */

    /** @type LanguageFn */
    function swift(hljs) {
      const WHITESPACE = {
        match: /\s+/,
        relevance: 0
      };
      // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID411
      const BLOCK_COMMENT = hljs.COMMENT('/\\*', '\\*/', {
        contains: ['self']
      });
      const COMMENTS = [hljs.C_LINE_COMMENT_MODE, BLOCK_COMMENT];

      // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID413
      // https://docs.swift.org/swift-book/ReferenceManual/zzSummaryOfTheGrammar.html
      const DOT_KEYWORD = {
        match: [/\./, either(...dotKeywords, ...optionalDotKeywords)],
        className: {
          2: "keyword"
        }
      };
      const KEYWORD_GUARD = {
        // Consume .keyword to prevent highlighting properties and methods as keywords.
        match: concat(/\./, either(...keywords)),
        relevance: 0
      };
      const PLAIN_KEYWORDS = keywords.filter(kw => typeof kw === 'string').concat(["_|0"]); // seems common, so 0 relevance
      const REGEX_KEYWORDS = keywords.filter(kw => typeof kw !== 'string') // find regex
      .concat(keywordTypes).map(keywordWrapper);
      const KEYWORD = {
        variants: [{
          className: 'keyword',
          match: either(...REGEX_KEYWORDS, ...optionalDotKeywords)
        }]
      };
      // find all the regular keywords
      const KEYWORDS = {
        $pattern: either(/\b\w+/,
        // regular keywords
        /#\w+/ // number keywords
        ),

        keyword: PLAIN_KEYWORDS.concat(numberSignKeywords),
        literal: literals
      };
      const KEYWORD_MODES = [DOT_KEYWORD, KEYWORD_GUARD, KEYWORD];

      // https://github.com/apple/swift/tree/main/stdlib/public/core
      const BUILT_IN_GUARD = {
        // Consume .built_in to prevent highlighting properties and methods.
        match: concat(/\./, either(...builtIns)),
        relevance: 0
      };
      const BUILT_IN = {
        className: 'built_in',
        match: concat(/\b/, either(...builtIns), /(?=\()/)
      };
      const BUILT_INS = [BUILT_IN_GUARD, BUILT_IN];

      // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID418
      const OPERATOR_GUARD = {
        // Prevent -> from being highlighting as an operator.
        match: /->/,
        relevance: 0
      };
      const OPERATOR = {
        className: 'operator',
        relevance: 0,
        variants: [{
          match: operator
        }, {
          // dot-operator: only operators that start with a dot are allowed to use dots as
          // characters (..., ...<, .*, etc). So there rule here is: a dot followed by one or more
          // characters that may also include dots.
          match: `\\.(\\.|${operatorCharacter})+`
        }]
      };
      const OPERATORS = [OPERATOR_GUARD, OPERATOR];

      // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#grammar_numeric-literal
      // TODO: Update for leading `-` after lookbehind is supported everywhere
      const decimalDigits = '([0-9]_*)+';
      const hexDigits = '([0-9a-fA-F]_*)+';
      const NUMBER = {
        className: 'number',
        relevance: 0,
        variants: [
        // decimal floating-point-literal (subsumes decimal-literal)
        {
          match: `\\b(${decimalDigits})(\\.(${decimalDigits}))?` + `([eE][+-]?(${decimalDigits}))?\\b`
        },
        // hexadecimal floating-point-literal (subsumes hexadecimal-literal)
        {
          match: `\\b0x(${hexDigits})(\\.(${hexDigits}))?` + `([pP][+-]?(${decimalDigits}))?\\b`
        },
        // octal-literal
        {
          match: /\b0o([0-7]_*)+\b/
        },
        // binary-literal
        {
          match: /\b0b([01]_*)+\b/
        }]
      };

      // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#grammar_string-literal
      const ESCAPED_CHARACTER = (rawDelimiter = "") => ({
        className: 'subst',
        variants: [{
          match: concat(/\\/, rawDelimiter, /[0\\tnr"']/)
        }, {
          match: concat(/\\/, rawDelimiter, /u\{[0-9a-fA-F]{1,8}\}/)
        }]
      });
      const ESCAPED_NEWLINE = (rawDelimiter = "") => ({
        className: 'subst',
        match: concat(/\\/, rawDelimiter, /[\t ]*(?:[\r\n]|\r\n)/)
      });
      const INTERPOLATION = (rawDelimiter = "") => ({
        className: 'subst',
        label: "interpol",
        begin: concat(/\\/, rawDelimiter, /\(/),
        end: /\)/
      });
      const MULTILINE_STRING = (rawDelimiter = "") => ({
        begin: concat(rawDelimiter, /"""/),
        end: concat(/"""/, rawDelimiter),
        contains: [ESCAPED_CHARACTER(rawDelimiter), ESCAPED_NEWLINE(rawDelimiter), INTERPOLATION(rawDelimiter)]
      });
      const SINGLE_LINE_STRING = (rawDelimiter = "") => ({
        begin: concat(rawDelimiter, /"/),
        end: concat(/"/, rawDelimiter),
        contains: [ESCAPED_CHARACTER(rawDelimiter), INTERPOLATION(rawDelimiter)]
      });
      const STRING = {
        className: 'string',
        variants: [MULTILINE_STRING(), MULTILINE_STRING("#"), MULTILINE_STRING("##"), MULTILINE_STRING("###"), SINGLE_LINE_STRING(), SINGLE_LINE_STRING("#"), SINGLE_LINE_STRING("##"), SINGLE_LINE_STRING("###")]
      };

      // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID412
      const QUOTED_IDENTIFIER = {
        match: concat(/`/, identifier, /`/)
      };
      const IMPLICIT_PARAMETER = {
        className: 'variable',
        match: /\$\d+/
      };
      const PROPERTY_WRAPPER_PROJECTION = {
        className: 'variable',
        match: `\\$${identifierCharacter}+`
      };
      const IDENTIFIERS = [QUOTED_IDENTIFIER, IMPLICIT_PARAMETER, PROPERTY_WRAPPER_PROJECTION];

      // https://docs.swift.org/swift-book/ReferenceManual/Attributes.html
      const AVAILABLE_ATTRIBUTE = {
        match: /(@|#(un)?)available/,
        className: "keyword",
        starts: {
          contains: [{
            begin: /\(/,
            end: /\)/,
            keywords: availabilityKeywords,
            contains: [...OPERATORS, NUMBER, STRING]
          }]
        }
      };
      const KEYWORD_ATTRIBUTE = {
        className: 'keyword',
        match: concat(/@/, either(...keywordAttributes))
      };
      const USER_DEFINED_ATTRIBUTE = {
        className: 'meta',
        match: concat(/@/, identifier)
      };
      const ATTRIBUTES = [AVAILABLE_ATTRIBUTE, KEYWORD_ATTRIBUTE, USER_DEFINED_ATTRIBUTE];

      // https://docs.swift.org/swift-book/ReferenceManual/Types.html
      const TYPE = {
        match: lookahead(/\b[A-Z]/),
        relevance: 0,
        contains: [{
          // Common Apple frameworks, for relevance boost
          className: 'type',
          match: concat(/(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)/, identifierCharacter, '+')
        }, {
          // Type identifier
          className: 'type',
          match: typeIdentifier,
          relevance: 0
        }, {
          // Optional type
          match: /[?!]+/,
          relevance: 0
        }, {
          // Variadic parameter
          match: /\.\.\./,
          relevance: 0
        }, {
          // Protocol composition
          match: concat(/\s+&\s+/, lookahead(typeIdentifier)),
          relevance: 0
        }]
      };
      const GENERIC_ARGUMENTS = {
        begin: /</,
        end: />/,
        keywords: KEYWORDS,
        contains: [...COMMENTS, ...KEYWORD_MODES, ...ATTRIBUTES, OPERATOR_GUARD, TYPE]
      };
      TYPE.contains.push(GENERIC_ARGUMENTS);

      // https://docs.swift.org/swift-book/ReferenceManual/Expressions.html#ID552
      // Prevents element names from being highlighted as keywords.
      const TUPLE_ELEMENT_NAME = {
        match: concat(identifier, /\s*:/),
        keywords: "_|0",
        relevance: 0
      };
      // Matches tuples as well as the parameter list of a function type.
      const TUPLE = {
        begin: /\(/,
        end: /\)/,
        relevance: 0,
        keywords: KEYWORDS,
        contains: ['self', TUPLE_ELEMENT_NAME, ...COMMENTS, ...KEYWORD_MODES, ...BUILT_INS, ...OPERATORS, NUMBER, STRING, ...IDENTIFIERS, ...ATTRIBUTES, TYPE]
      };
      const GENERIC_PARAMETERS = {
        begin: /</,
        end: />/,
        contains: [...COMMENTS, TYPE]
      };
      const FUNCTION_PARAMETER_NAME = {
        begin: either(lookahead(concat(identifier, /\s*:/)), lookahead(concat(identifier, /\s+/, identifier, /\s*:/))),
        end: /:/,
        relevance: 0,
        contains: [{
          className: 'keyword',
          match: /\b_\b/
        }, {
          className: 'params',
          match: identifier
        }]
      };
      const FUNCTION_PARAMETERS = {
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS,
        contains: [FUNCTION_PARAMETER_NAME, ...COMMENTS, ...KEYWORD_MODES, ...OPERATORS, NUMBER, STRING, ...ATTRIBUTES, TYPE, TUPLE],
        endsParent: true,
        illegal: /["']/
      };
      // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID362
      const FUNCTION = {
        match: [/func/, /\s+/, either(QUOTED_IDENTIFIER.match, identifier, operator)],
        className: {
          1: "keyword",
          3: "title.function"
        },
        contains: [GENERIC_PARAMETERS, FUNCTION_PARAMETERS, WHITESPACE],
        illegal: [/\[/, /%/]
      };

      // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID375
      // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID379
      const INIT_SUBSCRIPT = {
        match: [/\b(?:subscript|init[?!]?)/, /\s*(?=[<(])/],
        className: {
          1: "keyword"
        },
        contains: [GENERIC_PARAMETERS, FUNCTION_PARAMETERS, WHITESPACE],
        illegal: /\[|%/
      };
      // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID380
      const OPERATOR_DECLARATION = {
        match: [/operator/, /\s+/, operator],
        className: {
          1: "keyword",
          3: "title"
        }
      };

      // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID550
      const PRECEDENCEGROUP = {
        begin: [/precedencegroup/, /\s+/, typeIdentifier],
        className: {
          1: "keyword",
          3: "title"
        },
        contains: [TYPE],
        keywords: [...precedencegroupKeywords, ...literals],
        end: /}/
      };

      // Add supported submodes to string interpolation.
      for (const variant of STRING.variants) {
        const interpolation = variant.contains.find(mode => mode.label === "interpol");
        // TODO: Interpolation can contain any expression, so there's room for improvement here.
        interpolation.keywords = KEYWORDS;
        const submodes = [...KEYWORD_MODES, ...BUILT_INS, ...OPERATORS, NUMBER, STRING, ...IDENTIFIERS];
        interpolation.contains = [...submodes, {
          begin: /\(/,
          end: /\)/,
          contains: ['self', ...submodes]
        }];
      }
      return {
        name: 'Swift',
        keywords: KEYWORDS,
        contains: [...COMMENTS, FUNCTION, INIT_SUBSCRIPT, {
          beginKeywords: 'struct protocol class extension enum actor',
          end: '\\{',
          excludeEnd: true,
          keywords: KEYWORDS,
          contains: [hljs.inherit(hljs.TITLE_MODE, {
            className: "title.class",
            begin: /[A-Za-z$_][\u00C0-\u02B80-9A-Za-z$_]*/
          }), ...KEYWORD_MODES]
        }, OPERATOR_DECLARATION, PRECEDENCEGROUP, {
          beginKeywords: 'import',
          end: /$/,
          contains: [...COMMENTS],
          relevance: 0
        }, ...KEYWORD_MODES, ...BUILT_INS, ...OPERATORS, NUMBER, STRING, ...IDENTIFIERS, ...ATTRIBUTES, TYPE, TUPLE]
      };
    }
    swift_1 = swift;
    return swift_1;
  }

  /*
  Language: YAML
  Description: Yet Another Markdown Language
  Author: Stefan Wienert <stwienert@gmail.com>
  Contributors: Carl Baxter <carl@cbax.tech>
  Requires: ruby.js
  Website: https://yaml.org
  Category: common, config
  */
  var yaml_1;
  var hasRequiredYaml;
  function requireYaml() {
    if (hasRequiredYaml) return yaml_1;
    hasRequiredYaml = 1;
    function yaml(hljs) {
      const LITERALS = 'true false yes no null';

      // YAML spec allows non-reserved URI characters in tags.
      const URI_CHARACTERS = '[\\w#;/?:@&=+$,.~*\'()[\\]]+';

      // Define keys as starting with a word character
      // ...containing word chars, spaces, colons, forward-slashes, hyphens and periods
      // ...and ending with a colon followed immediately by a space, tab or newline.
      // The YAML spec allows for much more than this, but this covers most use-cases.
      const KEY = {
        className: 'attr',
        variants: [{
          begin: '\\w[\\w :\\/.-]*:(?=[ \t]|$)'
        }, {
          // double quoted keys
          begin: '"\\w[\\w :\\/.-]*":(?=[ \t]|$)'
        }, {
          // single quoted keys
          begin: '\'\\w[\\w :\\/.-]*\':(?=[ \t]|$)'
        }]
      };
      const TEMPLATE_VARIABLES = {
        className: 'template-variable',
        variants: [{
          // jinja templates Ansible
          begin: /\{\{/,
          end: /\}\}/
        }, {
          // Ruby i18n
          begin: /%\{/,
          end: /\}/
        }]
      };
      const STRING = {
        className: 'string',
        relevance: 0,
        variants: [{
          begin: /'/,
          end: /'/
        }, {
          begin: /"/,
          end: /"/
        }, {
          begin: /\S+/
        }],
        contains: [hljs.BACKSLASH_ESCAPE, TEMPLATE_VARIABLES]
      };

      // Strings inside of value containers (objects) can't contain braces,
      // brackets, or commas
      const CONTAINER_STRING = hljs.inherit(STRING, {
        variants: [{
          begin: /'/,
          end: /'/
        }, {
          begin: /"/,
          end: /"/
        }, {
          begin: /[^\s,{}[\]]+/
        }]
      });
      const DATE_RE = '[0-9]{4}(-[0-9][0-9]){0,2}';
      const TIME_RE = '([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?';
      const FRACTION_RE = '(\\.[0-9]*)?';
      const ZONE_RE = '([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?';
      const TIMESTAMP = {
        className: 'number',
        begin: '\\b' + DATE_RE + TIME_RE + FRACTION_RE + ZONE_RE + '\\b'
      };
      const VALUE_CONTAINER = {
        end: ',',
        endsWithParent: true,
        excludeEnd: true,
        keywords: LITERALS,
        relevance: 0
      };
      const OBJECT = {
        begin: /\{/,
        end: /\}/,
        contains: [VALUE_CONTAINER],
        illegal: '\\n',
        relevance: 0
      };
      const ARRAY = {
        begin: '\\[',
        end: '\\]',
        contains: [VALUE_CONTAINER],
        illegal: '\\n',
        relevance: 0
      };
      const MODES = [KEY, {
        className: 'meta',
        begin: '^---\\s*$',
        relevance: 10
      }, {
        // multi line string
        // Blocks start with a | or > followed by a newline
        //
        // Indentation of subsequent lines must be the same to
        // be considered part of the block
        className: 'string',
        begin: '[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*'
      }, {
        // Ruby/Rails erb
        begin: '<%[%=-]?',
        end: '[%-]?%>',
        subLanguage: 'ruby',
        excludeBegin: true,
        excludeEnd: true,
        relevance: 0
      }, {
        // named tags
        className: 'type',
        begin: '!\\w+!' + URI_CHARACTERS
      },
      // https://yaml.org/spec/1.2/spec.html#id2784064
      {
        // verbatim tags
        className: 'type',
        begin: '!<' + URI_CHARACTERS + ">"
      }, {
        // primary tags
        className: 'type',
        begin: '!' + URI_CHARACTERS
      }, {
        // secondary tags
        className: 'type',
        begin: '!!' + URI_CHARACTERS
      }, {
        // fragment id &ref
        className: 'meta',
        begin: '&' + hljs.UNDERSCORE_IDENT_RE + '$'
      }, {
        // fragment reference *ref
        className: 'meta',
        begin: '\\*' + hljs.UNDERSCORE_IDENT_RE + '$'
      }, {
        // array listing
        className: 'bullet',
        // TODO: remove |$ hack when we have proper look-ahead support
        begin: '-(?=[ ]|$)',
        relevance: 0
      }, hljs.HASH_COMMENT_MODE, {
        beginKeywords: LITERALS,
        keywords: {
          literal: LITERALS
        }
      }, TIMESTAMP,
      // numbers are any valid C-style number that
      // sit isolated from other words
      {
        className: 'number',
        begin: hljs.C_NUMBER_RE + '\\b',
        relevance: 0
      }, OBJECT, ARRAY, STRING];
      const VALUE_MODES = [...MODES];
      VALUE_MODES.pop();
      VALUE_MODES.push(CONTAINER_STRING);
      VALUE_CONTAINER.contains = VALUE_MODES;
      return {
        name: 'YAML',
        case_insensitive: true,
        aliases: ['yml'],
        contains: MODES
      };
    }
    yaml_1 = yaml;
    return yaml_1;
  }

  var typescript_1;
  var hasRequiredTypescript;
  function requireTypescript() {
    if (hasRequiredTypescript) return typescript_1;
    hasRequiredTypescript = 1;
    const IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
    const KEYWORDS = ["as",
    // for exports
    "in", "of", "if", "for", "while", "finally", "var", "new", "function", "do", "return", "void", "else", "break", "catch", "instanceof", "with", "throw", "case", "default", "try", "switch", "continue", "typeof", "delete", "let", "yield", "const", "class",
    // JS handles these with a special rule
    // "get",
    // "set",
    "debugger", "async", "await", "static", "import", "from", "export", "extends"];
    const LITERALS = ["true", "false", "null", "undefined", "NaN", "Infinity"];

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
    const TYPES = [
    // Fundamental objects
    "Object", "Function", "Boolean", "Symbol",
    // numbers and dates
    "Math", "Date", "Number", "BigInt",
    // text
    "String", "RegExp",
    // Indexed collections
    "Array", "Float32Array", "Float64Array", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Int32Array", "Uint16Array", "Uint32Array", "BigInt64Array", "BigUint64Array",
    // Keyed collections
    "Set", "Map", "WeakSet", "WeakMap",
    // Structured data
    "ArrayBuffer", "SharedArrayBuffer", "Atomics", "DataView", "JSON",
    // Control abstraction objects
    "Promise", "Generator", "GeneratorFunction", "AsyncFunction",
    // Reflection
    "Reflect", "Proxy",
    // Internationalization
    "Intl",
    // WebAssembly
    "WebAssembly"];
    const ERROR_TYPES = ["Error", "EvalError", "InternalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"];
    const BUILT_IN_GLOBALS = ["setInterval", "setTimeout", "clearInterval", "clearTimeout", "require", "exports", "eval", "isFinite", "isNaN", "parseFloat", "parseInt", "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent", "escape", "unescape"];
    const BUILT_IN_VARIABLES = ["arguments", "this", "super", "console", "window", "document", "localStorage", "sessionStorage", "module", "global" // Node.js
    ];

    const BUILT_INS = [].concat(BUILT_IN_GLOBALS, TYPES, ERROR_TYPES);

    /*
    Language: JavaScript
    Description: JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.
    Category: common, scripting, web
    Website: https://developer.mozilla.org/en-US/docs/Web/JavaScript
    */

    /** @type LanguageFn */
    function javascript(hljs) {
      const regex = hljs.regex;
      /**
       * Takes a string like "<Booger" and checks to see
       * if we can find a matching "</Booger" later in the
       * content.
       * @param {RegExpMatchArray} match
       * @param {{after:number}} param1
       */
      const hasClosingTag = (match, {
        after
      }) => {
        const tag = "</" + match[0].slice(1);
        const pos = match.input.indexOf(tag, after);
        return pos !== -1;
      };
      const IDENT_RE$1 = IDENT_RE;
      const FRAGMENT = {
        begin: '<>',
        end: '</>'
      };
      // to avoid some special cases inside isTrulyOpeningTag
      const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
      const XML_TAG = {
        begin: /<[A-Za-z0-9\\._:-]+/,
        end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
        /**
         * @param {RegExpMatchArray} match
         * @param {CallbackResponse} response
         */
        isTrulyOpeningTag: (match, response) => {
          const afterMatchIndex = match[0].length + match.index;
          const nextChar = match.input[afterMatchIndex];
          if (
          // HTML should not include another raw `<` inside a tag
          // nested type?
          // `<Array<Array<number>>`, etc.
          nextChar === "<" ||
          // the , gives away that this is not HTML
          // `<T, A extends keyof T, V>`
          nextChar === ",") {
            response.ignoreMatch();
            return;
          }

          // `<something>`
          // Quite possibly a tag, lets look for a matching closing tag...
          if (nextChar === ">") {
            // if we cannot find a matching closing tag, then we
            // will ignore it
            if (!hasClosingTag(match, {
              after: afterMatchIndex
            })) {
              response.ignoreMatch();
            }
          }

          // `<blah />` (self-closing)
          // handled by simpleSelfClosing rule

          let m;
          const afterMatch = match.input.substring(afterMatchIndex);

          // some more template typing stuff
          //  <T = any>(key?: string) => Modify<
          if (m = afterMatch.match(/^\s*=/)) {
            response.ignoreMatch();
            return;
          }

          // `<From extends string>`
          // technically this could be HTML, but it smells like a type
          // NOTE: This is ugh, but added specifically for https://github.com/highlightjs/highlight.js/issues/3276
          if (m = afterMatch.match(/^\s+extends\s+/)) {
            if (m.index === 0) {
              response.ignoreMatch();
              // eslint-disable-next-line no-useless-return
              return;
            }
          }
        }
      };
      const KEYWORDS$1 = {
        $pattern: IDENT_RE,
        keyword: KEYWORDS,
        literal: LITERALS,
        built_in: BUILT_INS,
        "variable.language": BUILT_IN_VARIABLES
      };

      // https://tc39.es/ecma262/#sec-literals-numeric-literals
      const decimalDigits = '[0-9](_?[0-9])*';
      const frac = `\\.(${decimalDigits})`;
      // DecimalIntegerLiteral, including Annex B NonOctalDecimalIntegerLiteral
      // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
      const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
      const NUMBER = {
        className: 'number',
        variants: [
        // DecimalLiteral
        {
          begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))` + `[eE][+-]?(${decimalDigits})\\b`
        }, {
          begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b`
        },
        // DecimalBigIntegerLiteral
        {
          begin: `\\b(0|[1-9](_?[0-9])*)n\\b`
        },
        // NonDecimalIntegerLiteral
        {
          begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b"
        }, {
          begin: "\\b0[bB][0-1](_?[0-1])*n?\\b"
        }, {
          begin: "\\b0[oO][0-7](_?[0-7])*n?\\b"
        },
        // LegacyOctalIntegerLiteral (does not include underscore separators)
        // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
        {
          begin: "\\b0[0-7]+n?\\b"
        }],
        relevance: 0
      };
      const SUBST = {
        className: 'subst',
        begin: '\\$\\{',
        end: '\\}',
        keywords: KEYWORDS$1,
        contains: [] // defined later
      };

      const HTML_TEMPLATE = {
        begin: 'html`',
        end: '',
        starts: {
          end: '`',
          returnEnd: false,
          contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          subLanguage: 'xml'
        }
      };
      const CSS_TEMPLATE = {
        begin: 'css`',
        end: '',
        starts: {
          end: '`',
          returnEnd: false,
          contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          subLanguage: 'css'
        }
      };
      const GRAPHQL_TEMPLATE = {
        begin: 'gql`',
        end: '',
        starts: {
          end: '`',
          returnEnd: false,
          contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          subLanguage: 'graphql'
        }
      };
      const TEMPLATE_STRING = {
        className: 'string',
        begin: '`',
        end: '`',
        contains: [hljs.BACKSLASH_ESCAPE, SUBST]
      };
      const JSDOC_COMMENT = hljs.COMMENT(/\/\*\*(?!\/)/, '\\*/', {
        relevance: 0,
        contains: [{
          begin: '(?=@[A-Za-z]+)',
          relevance: 0,
          contains: [{
            className: 'doctag',
            begin: '@[A-Za-z]+'
          }, {
            className: 'type',
            begin: '\\{',
            end: '\\}',
            excludeEnd: true,
            excludeBegin: true,
            relevance: 0
          }, {
            className: 'variable',
            begin: IDENT_RE$1 + '(?=\\s*(-)|$)',
            endsParent: true,
            relevance: 0
          },
          // eat spaces (not newlines) so we can find
          // types or variables
          {
            begin: /(?=[^\n])\s/,
            relevance: 0
          }]
        }]
      });
      const COMMENT = {
        className: "comment",
        variants: [JSDOC_COMMENT, hljs.C_BLOCK_COMMENT_MODE, hljs.C_LINE_COMMENT_MODE]
      };
      const SUBST_INTERNALS = [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE, HTML_TEMPLATE, CSS_TEMPLATE, GRAPHQL_TEMPLATE, TEMPLATE_STRING,
      // Skip numbers when they are part of a variable name
      {
        match: /\$\d+/
      }, NUMBER
      // This is intentional:
      // See https://github.com/highlightjs/highlight.js/issues/3288
      // hljs.REGEXP_MODE
      ];

      SUBST.contains = SUBST_INTERNALS.concat({
        // we need to pair up {} inside our subst to prevent
        // it from ending too early by matching another }
        begin: /\{/,
        end: /\}/,
        keywords: KEYWORDS$1,
        contains: ["self"].concat(SUBST_INTERNALS)
      });
      const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
      const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
      // eat recursive parens in sub expressions
      {
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS$1,
        contains: ["self"].concat(SUBST_AND_COMMENTS)
      }]);
      const PARAMS = {
        className: 'params',
        begin: /\(/,
        end: /\)/,
        excludeBegin: true,
        excludeEnd: true,
        keywords: KEYWORDS$1,
        contains: PARAMS_CONTAINS
      };

      // ES6 classes
      const CLASS_OR_EXTENDS = {
        variants: [
        // class Car extends vehicle
        {
          match: [/class/, /\s+/, IDENT_RE$1, /\s+/, /extends/, /\s+/, regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")],
          scope: {
            1: "keyword",
            3: "title.class",
            5: "keyword",
            7: "title.class.inherited"
          }
        },
        // class Car
        {
          match: [/class/, /\s+/, IDENT_RE$1],
          scope: {
            1: "keyword",
            3: "title.class"
          }
        }]
      };
      const CLASS_REFERENCE = {
        relevance: 0,
        match: regex.either(
        // Hard coded exceptions
        /\bJSON/,
        // Float32Array, OutT
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        // CSSFactory, CSSFactoryT
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        // FPs, FPsT
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/
        // P
        // single letters are not highlighted
        // BLAH
        // this will be flagged as a UPPER_CASE_CONSTANT instead
        ),

        className: "title.class",
        keywords: {
          _: [
          // se we still get relevance credit for JS library classes
          ...TYPES, ...ERROR_TYPES]
        }
      };
      const USE_STRICT = {
        label: "use_strict",
        className: 'meta',
        relevance: 10,
        begin: /^\s*['"]use (strict|asm)['"]/
      };
      const FUNCTION_DEFINITION = {
        variants: [{
          match: [/function/, /\s+/, IDENT_RE$1, /(?=\s*\()/]
        },
        // anonymous function
        {
          match: [/function/, /\s*(?=\()/]
        }],
        className: {
          1: "keyword",
          3: "title.function"
        },
        label: "func.def",
        contains: [PARAMS],
        illegal: /%/
      };
      const UPPER_CASE_CONSTANT = {
        relevance: 0,
        match: /\b[A-Z][A-Z_0-9]+\b/,
        className: "variable.constant"
      };
      function noneOf(list) {
        return regex.concat("(?!", list.join("|"), ")");
      }
      const FUNCTION_CALL = {
        match: regex.concat(/\b/, noneOf([...BUILT_IN_GLOBALS, "super", "import"]), IDENT_RE$1, regex.lookahead(/\(/)),
        className: "title.function",
        relevance: 0
      };
      const PROPERTY_ACCESS = {
        begin: regex.concat(/\./, regex.lookahead(regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/))),
        end: IDENT_RE$1,
        excludeBegin: true,
        keywords: "prototype",
        className: "property",
        relevance: 0
      };
      const GETTER_OR_SETTER = {
        match: [/get|set/, /\s+/, IDENT_RE$1, /(?=\()/],
        className: {
          1: "keyword",
          3: "title.function"
        },
        contains: [{
          // eat to avoid empty params
          begin: /\(\)/
        }, PARAMS]
      };
      const FUNC_LEAD_IN_RE = '(\\(' + '[^()]*(\\(' + '[^()]*(\\(' + '[^()]*' + '\\)[^()]*)*' + '\\)[^()]*)*' + '\\)|' + hljs.UNDERSCORE_IDENT_RE + ')\\s*=>';
      const FUNCTION_VARIABLE = {
        match: [/const|var|let/, /\s+/, IDENT_RE$1, /\s*/, /=\s*/, /(async\s*)?/,
        // async is optional
        regex.lookahead(FUNC_LEAD_IN_RE)],
        keywords: "async",
        className: {
          1: "keyword",
          3: "title.function"
        },
        contains: [PARAMS]
      };
      return {
        name: 'JavaScript',
        aliases: ['js', 'jsx', 'mjs', 'cjs'],
        keywords: KEYWORDS$1,
        // this will be extended by TypeScript
        exports: {
          PARAMS_CONTAINS,
          CLASS_REFERENCE
        },
        illegal: /#(?![$_A-z])/,
        contains: [hljs.SHEBANG({
          label: "shebang",
          binary: "node",
          relevance: 5
        }), USE_STRICT, hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE, HTML_TEMPLATE, CSS_TEMPLATE, GRAPHQL_TEMPLATE, TEMPLATE_STRING, COMMENT,
        // Skip numbers when they are part of a variable name
        {
          match: /\$\d+/
        }, NUMBER, CLASS_REFERENCE, {
          className: 'attr',
          begin: IDENT_RE$1 + regex.lookahead(':'),
          relevance: 0
        }, FUNCTION_VARIABLE, {
          // "value" container
          begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
          keywords: 'return throw case',
          relevance: 0,
          contains: [COMMENT, hljs.REGEXP_MODE, {
            className: 'function',
            // we have to count the parens to make sure we actually have the
            // correct bounding ( ) before the =>.  There could be any number of
            // sub-expressions inside also surrounded by parens.
            begin: FUNC_LEAD_IN_RE,
            returnBegin: true,
            end: '\\s*=>',
            contains: [{
              className: 'params',
              variants: [{
                begin: hljs.UNDERSCORE_IDENT_RE,
                relevance: 0
              }, {
                className: null,
                begin: /\(\s*\)/,
                skip: true
              }, {
                begin: /\(/,
                end: /\)/,
                excludeBegin: true,
                excludeEnd: true,
                keywords: KEYWORDS$1,
                contains: PARAMS_CONTAINS
              }]
            }]
          }, {
            // could be a comma delimited list of params to a function call
            begin: /,/,
            relevance: 0
          }, {
            match: /\s+/,
            relevance: 0
          }, {
            // JSX
            variants: [{
              begin: FRAGMENT.begin,
              end: FRAGMENT.end
            }, {
              match: XML_SELF_CLOSING
            }, {
              begin: XML_TAG.begin,
              // we carefully check the opening tag to see if it truly
              // is a tag and not a false positive
              'on:begin': XML_TAG.isTrulyOpeningTag,
              end: XML_TAG.end
            }],
            subLanguage: 'xml',
            contains: [{
              begin: XML_TAG.begin,
              end: XML_TAG.end,
              skip: true,
              contains: ['self']
            }]
          }]
        }, FUNCTION_DEFINITION, {
          // prevent this from getting swallowed up by function
          // since they appear "function like"
          beginKeywords: "while if switch catch for"
        }, {
          // we have to count the parens to make sure we actually have the correct
          // bounding ( ).  There could be any number of sub-expressions inside
          // also surrounded by parens.
          begin: '\\b(?!function)' + hljs.UNDERSCORE_IDENT_RE + '\\(' +
          // first parens
          '[^()]*(\\(' + '[^()]*(\\(' + '[^()]*' + '\\)[^()]*)*' + '\\)[^()]*)*' + '\\)\\s*\\{',
          // end parens
          returnBegin: true,
          label: "func.def",
          contains: [PARAMS, hljs.inherit(hljs.TITLE_MODE, {
            begin: IDENT_RE$1,
            className: "title.function"
          })]
        },
        // catch ... so it won't trigger the property rule below
        {
          match: /\.\.\./,
          relevance: 0
        }, PROPERTY_ACCESS,
        // hack: prevents detection of keywords in some circumstances
        // .keyword()
        // $keyword = x
        {
          match: '\\$' + IDENT_RE$1,
          relevance: 0
        }, {
          match: [/\bconstructor(?=\s*\()/],
          className: {
            1: "title.function"
          },
          contains: [PARAMS]
        }, FUNCTION_CALL, UPPER_CASE_CONSTANT, CLASS_OR_EXTENDS, GETTER_OR_SETTER, {
          match: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
        }]
      };
    }

    /*
    Language: TypeScript
    Author: Panu Horsmalahti <panu.horsmalahti@iki.fi>
    Contributors: Ike Ku <dempfi@yahoo.com>
    Description: TypeScript is a strict superset of JavaScript
    Website: https://www.typescriptlang.org
    Category: common, scripting
    */

    /** @type LanguageFn */
    function typescript(hljs) {
      const tsLanguage = javascript(hljs);
      const IDENT_RE$1 = IDENT_RE;
      const TYPES = ["any", "void", "number", "boolean", "string", "object", "never", "symbol", "bigint", "unknown"];
      const NAMESPACE = {
        beginKeywords: 'namespace',
        end: /\{/,
        excludeEnd: true,
        contains: [tsLanguage.exports.CLASS_REFERENCE]
      };
      const INTERFACE = {
        beginKeywords: 'interface',
        end: /\{/,
        excludeEnd: true,
        keywords: {
          keyword: 'interface extends',
          built_in: TYPES
        },
        contains: [tsLanguage.exports.CLASS_REFERENCE]
      };
      const USE_STRICT = {
        className: 'meta',
        relevance: 10,
        begin: /^\s*['"]use strict['"]/
      };
      const TS_SPECIFIC_KEYWORDS = ["type", "namespace", "interface", "public", "private", "protected", "implements", "declare", "abstract", "readonly", "enum", "override"];
      const KEYWORDS$1 = {
        $pattern: IDENT_RE,
        keyword: KEYWORDS.concat(TS_SPECIFIC_KEYWORDS),
        literal: LITERALS,
        built_in: BUILT_INS.concat(TYPES),
        "variable.language": BUILT_IN_VARIABLES
      };
      const DECORATOR = {
        className: 'meta',
        begin: '@' + IDENT_RE$1
      };
      const swapMode = (mode, label, replacement) => {
        const indx = mode.contains.findIndex(m => m.label === label);
        if (indx === -1) {
          throw new Error("can not find mode to replace");
        }
        mode.contains.splice(indx, 1, replacement);
      };

      // this should update anywhere keywords is used since
      // it will be the same actual JS object
      Object.assign(tsLanguage.keywords, KEYWORDS$1);
      tsLanguage.exports.PARAMS_CONTAINS.push(DECORATOR);
      tsLanguage.contains = tsLanguage.contains.concat([DECORATOR, NAMESPACE, INTERFACE]);

      // TS gets a simpler shebang rule than JS
      swapMode(tsLanguage, "shebang", hljs.SHEBANG());
      // JS use strict rule purposely excludes `asm` which makes no sense
      swapMode(tsLanguage, "use_strict", USE_STRICT);
      const functionDeclaration = tsLanguage.contains.find(m => m.label === "func.def");
      functionDeclaration.relevance = 0; // () => {} is more typical in TypeScript

      Object.assign(tsLanguage, {
        name: 'TypeScript',
        aliases: ['ts', 'tsx', 'mts', 'cts']
      });
      return tsLanguage;
    }
    typescript_1 = typescript;
    return typescript_1;
  }

  /*
  Language: Visual Basic .NET
  Description: Visual Basic .NET (VB.NET) is a multi-paradigm, object-oriented programming language, implemented on the .NET Framework.
  Authors: Poren Chiang <ren.chiang@gmail.com>, Jan Pilzer
  Website: https://docs.microsoft.com/dotnet/visual-basic/getting-started
  Category: common
  */
  var vbnet_1;
  var hasRequiredVbnet;
  function requireVbnet() {
    if (hasRequiredVbnet) return vbnet_1;
    hasRequiredVbnet = 1;
    /** @type LanguageFn */
    function vbnet(hljs) {
      const regex = hljs.regex;
      /**
       * Character Literal
       * Either a single character ("a"C) or an escaped double quote (""""C).
       */
      const CHARACTER = {
        className: 'string',
        begin: /"(""|[^/n])"C\b/
      };
      const STRING = {
        className: 'string',
        begin: /"/,
        end: /"/,
        illegal: /\n/,
        contains: [{
          // double quote escape
          begin: /""/
        }]
      };

      /** Date Literals consist of a date, a time, or both separated by whitespace, surrounded by # */
      const MM_DD_YYYY = /\d{1,2}\/\d{1,2}\/\d{4}/;
      const YYYY_MM_DD = /\d{4}-\d{1,2}-\d{1,2}/;
      const TIME_12H = /(\d|1[012])(:\d+){0,2} *(AM|PM)/;
      const TIME_24H = /\d{1,2}(:\d{1,2}){1,2}/;
      const DATE = {
        className: 'literal',
        variants: [{
          // #YYYY-MM-DD# (ISO-Date) or #M/D/YYYY# (US-Date)
          begin: regex.concat(/# */, regex.either(YYYY_MM_DD, MM_DD_YYYY), / *#/)
        }, {
          // #H:mm[:ss]# (24h Time)
          begin: regex.concat(/# */, TIME_24H, / *#/)
        }, {
          // #h[:mm[:ss]] A# (12h Time)
          begin: regex.concat(/# */, TIME_12H, / *#/)
        }, {
          // date plus time
          begin: regex.concat(/# */, regex.either(YYYY_MM_DD, MM_DD_YYYY), / +/, regex.either(TIME_12H, TIME_24H), / *#/)
        }]
      };
      const NUMBER = {
        className: 'number',
        relevance: 0,
        variants: [{
          // Float
          begin: /\b\d[\d_]*((\.[\d_]+(E[+-]?[\d_]+)?)|(E[+-]?[\d_]+))[RFD@!#]?/
        }, {
          // Integer (base 10)
          begin: /\b\d[\d_]*((U?[SIL])|[%&])?/
        }, {
          // Integer (base 16)
          begin: /&H[\dA-F_]+((U?[SIL])|[%&])?/
        }, {
          // Integer (base 8)
          begin: /&O[0-7_]+((U?[SIL])|[%&])?/
        }, {
          // Integer (base 2)
          begin: /&B[01_]+((U?[SIL])|[%&])?/
        }]
      };
      const LABEL = {
        className: 'label',
        begin: /^\w+:/
      };
      const DOC_COMMENT = hljs.COMMENT(/'''/, /$/, {
        contains: [{
          className: 'doctag',
          begin: /<\/?/,
          end: />/
        }]
      });
      const COMMENT = hljs.COMMENT(null, /$/, {
        variants: [{
          begin: /'/
        }, {
          // TODO: Use multi-class for leading spaces
          begin: /([\t ]|^)REM(?=\s)/
        }]
      });
      const DIRECTIVES = {
        className: 'meta',
        // TODO: Use multi-class for indentation once available
        begin: /[\t ]*#(const|disable|else|elseif|enable|end|externalsource|if|region)\b/,
        end: /$/,
        keywords: {
          keyword: 'const disable else elseif enable end externalsource if region then'
        },
        contains: [COMMENT]
      };
      return {
        name: 'Visual Basic .NET',
        aliases: ['vb'],
        case_insensitive: true,
        classNameAliases: {
          label: 'symbol'
        },
        keywords: {
          keyword: 'addhandler alias aggregate ansi as async assembly auto binary by byref byval ' /* a-b */ + 'call case catch class compare const continue custom declare default delegate dim distinct do ' /* c-d */ + 'each equals else elseif end enum erase error event exit explicit finally for friend from function ' /* e-f */ + 'get global goto group handles if implements imports in inherits interface into iterator ' /* g-i */ + 'join key let lib loop me mid module mustinherit mustoverride mybase myclass ' /* j-m */ + 'namespace narrowing new next notinheritable notoverridable ' /* n */ + 'of off on operator option optional order overloads overridable overrides ' /* o */ + 'paramarray partial preserve private property protected public ' /* p */ + 'raiseevent readonly redim removehandler resume return ' /* r */ + 'select set shadows shared skip static step stop structure strict sub synclock ' /* s */ + 'take text then throw to try unicode until using when where while widening with withevents writeonly yield' /* t-y */,
          built_in:
          // Operators https://docs.microsoft.com/dotnet/visual-basic/language-reference/operators
          'addressof and andalso await directcast gettype getxmlnamespace is isfalse isnot istrue like mod nameof new not or orelse trycast typeof xor '
          // Type Conversion Functions https://docs.microsoft.com/dotnet/visual-basic/language-reference/functions/type-conversion-functions
          + 'cbool cbyte cchar cdate cdbl cdec cint clng cobj csbyte cshort csng cstr cuint culng cushort',
          type:
          // Data types https://docs.microsoft.com/dotnet/visual-basic/language-reference/data-types
          'boolean byte char date decimal double integer long object sbyte short single string uinteger ulong ushort',
          literal: 'true false nothing'
        },
        illegal: '//|\\{|\\}|endif|gosub|variant|wend|^\\$ ' /* reserved deprecated keywords */,
        contains: [CHARACTER, STRING, DATE, NUMBER, LABEL, DOC_COMMENT, COMMENT, DIRECTIVES]
      };
    }
    vbnet_1 = vbnet;
    return vbnet_1;
  }

  /*
  Language: WebAssembly
  Website: https://webassembly.org
  Description:  Wasm is designed as a portable compilation target for programming languages, enabling deployment on the web for client and server applications.
  Category: web, common
  Audit: 2020
  */
  var wasm_1;
  var hasRequiredWasm;
  function requireWasm() {
    if (hasRequiredWasm) return wasm_1;
    hasRequiredWasm = 1;
    /** @type LanguageFn */
    function wasm(hljs) {
      hljs.regex;
      const BLOCK_COMMENT = hljs.COMMENT(/\(;/, /;\)/);
      BLOCK_COMMENT.contains.push("self");
      const LINE_COMMENT = hljs.COMMENT(/;;/, /$/);
      const KWS = ["anyfunc", "block", "br", "br_if", "br_table", "call", "call_indirect", "data", "drop", "elem", "else", "end", "export", "func", "global.get", "global.set", "local.get", "local.set", "local.tee", "get_global", "get_local", "global", "if", "import", "local", "loop", "memory", "memory.grow", "memory.size", "module", "mut", "nop", "offset", "param", "result", "return", "select", "set_global", "set_local", "start", "table", "tee_local", "then", "type", "unreachable"];
      const FUNCTION_REFERENCE = {
        begin: [/(?:func|call|call_indirect)/, /\s+/, /\$[^\s)]+/],
        className: {
          1: "keyword",
          3: "title.function"
        }
      };
      const ARGUMENT = {
        className: "variable",
        begin: /\$[\w_]+/
      };
      const PARENS = {
        match: /(\((?!;)|\))+/,
        className: "punctuation",
        relevance: 0
      };
      const NUMBER = {
        className: "number",
        relevance: 0,
        // borrowed from Prism, TODO: split out into variants
        match: /[+-]?\b(?:\d(?:_?\d)*(?:\.\d(?:_?\d)*)?(?:[eE][+-]?\d(?:_?\d)*)?|0x[\da-fA-F](?:_?[\da-fA-F])*(?:\.[\da-fA-F](?:_?[\da-fA-D])*)?(?:[pP][+-]?\d(?:_?\d)*)?)\b|\binf\b|\bnan(?::0x[\da-fA-F](?:_?[\da-fA-D])*)?\b/
      };
      const TYPE = {
        // look-ahead prevents us from gobbling up opcodes
        match: /(i32|i64|f32|f64)(?!\.)/,
        className: "type"
      };
      const MATH_OPERATIONS = {
        className: "keyword",
        // borrowed from Prism, TODO: split out into variants
        match: /\b(f32|f64|i32|i64)(?:\.(?:abs|add|and|ceil|clz|const|convert_[su]\/i(?:32|64)|copysign|ctz|demote\/f64|div(?:_[su])?|eqz?|extend_[su]\/i32|floor|ge(?:_[su])?|gt(?:_[su])?|le(?:_[su])?|load(?:(?:8|16|32)_[su])?|lt(?:_[su])?|max|min|mul|nearest|neg?|or|popcnt|promote\/f32|reinterpret\/[fi](?:32|64)|rem_[su]|rot[lr]|shl|shr_[su]|store(?:8|16|32)?|sqrt|sub|trunc(?:_[su]\/f(?:32|64))?|wrap\/i64|xor))\b/
      };
      const OFFSET_ALIGN = {
        match: [/(?:offset|align)/, /\s*/, /=/],
        className: {
          1: "keyword",
          3: "operator"
        }
      };
      return {
        name: 'WebAssembly',
        keywords: {
          $pattern: /[\w.]+/,
          keyword: KWS
        },
        contains: [LINE_COMMENT, BLOCK_COMMENT, OFFSET_ALIGN, ARGUMENT, PARENS, FUNCTION_REFERENCE, hljs.QUOTE_STRING_MODE, TYPE, MATH_OPERATIONS, NUMBER]
      };
    }
    wasm_1 = wasm;
    return wasm_1;
  }

  var hljs$1 = core;
  hljs$1.registerLanguage('xml', requireXml());
  hljs$1.registerLanguage('bash', requireBash());
  hljs$1.registerLanguage('c', requireC());
  hljs$1.registerLanguage('cpp', requireCpp());
  hljs$1.registerLanguage('csharp', requireCsharp());
  hljs$1.registerLanguage('css', requireCss());
  hljs$1.registerLanguage('markdown', requireMarkdown());
  hljs$1.registerLanguage('diff', requireDiff());
  hljs$1.registerLanguage('ruby', requireRuby());
  hljs$1.registerLanguage('go', requireGo());
  hljs$1.registerLanguage('graphql', requireGraphql());
  hljs$1.registerLanguage('ini', requireIni());
  hljs$1.registerLanguage('java', requireJava());
  hljs$1.registerLanguage('javascript', requireJavascript());
  hljs$1.registerLanguage('json', requireJson());
  hljs$1.registerLanguage('kotlin', requireKotlin());
  hljs$1.registerLanguage('less', requireLess());
  hljs$1.registerLanguage('lua', requireLua());
  hljs$1.registerLanguage('makefile', requireMakefile());
  hljs$1.registerLanguage('perl', requirePerl());
  hljs$1.registerLanguage('objectivec', requireObjectivec());
  hljs$1.registerLanguage('php', requirePhp());
  hljs$1.registerLanguage('php-template', requirePhpTemplate());
  hljs$1.registerLanguage('plaintext', requirePlaintext());
  hljs$1.registerLanguage('python', requirePython());
  hljs$1.registerLanguage('python-repl', requirePythonRepl());
  hljs$1.registerLanguage('r', requireR());
  hljs$1.registerLanguage('rust', requireRust());
  hljs$1.registerLanguage('scss', requireScss());
  hljs$1.registerLanguage('shell', requireShell());
  hljs$1.registerLanguage('sql', requireSql());
  hljs$1.registerLanguage('swift', requireSwift());
  hljs$1.registerLanguage('yaml', requireYaml());
  hljs$1.registerLanguage('typescript', requireTypescript());
  hljs$1.registerLanguage('vbnet', requireVbnet());
  hljs$1.registerLanguage('wasm', requireWasm());
  hljs$1.HighlightJS = hljs$1;
  hljs$1.default = hljs$1;
  var common = hljs$1;

  var showdown = {exports: {}};

  (function (module) {
    (function () {
      /**
       * Created by Tivie on 13-07-2015.
       */

      function getDefaultOpts(simple) {

        var defaultOptions = {
          omitExtraWLInCodeBlocks: {
            defaultValue: false,
            describe: 'Omit the default extra whiteline added to code blocks',
            type: 'boolean'
          },
          noHeaderId: {
            defaultValue: false,
            describe: 'Turn on/off generated header id',
            type: 'boolean'
          },
          prefixHeaderId: {
            defaultValue: false,
            describe: 'Add a prefix to the generated header ids. Passing a string will prefix that string to the header id. Setting to true will add a generic \'section-\' prefix',
            type: 'string'
          },
          rawPrefixHeaderId: {
            defaultValue: false,
            describe: 'Setting this option to true will prevent showdown from modifying the prefix. This might result in malformed IDs (if, for instance, the " char is used in the prefix)',
            type: 'boolean'
          },
          ghCompatibleHeaderId: {
            defaultValue: false,
            describe: 'Generate header ids compatible with github style (spaces are replaced with dashes, a bunch of non alphanumeric chars are removed)',
            type: 'boolean'
          },
          rawHeaderId: {
            defaultValue: false,
            describe: 'Remove only spaces, \' and " from generated header ids (including prefixes), replacing them with dashes (-). WARNING: This might result in malformed ids',
            type: 'boolean'
          },
          headerLevelStart: {
            defaultValue: false,
            describe: 'The header blocks level start',
            type: 'integer'
          },
          parseImgDimensions: {
            defaultValue: false,
            describe: 'Turn on/off image dimension parsing',
            type: 'boolean'
          },
          simplifiedAutoLink: {
            defaultValue: false,
            describe: 'Turn on/off GFM autolink style',
            type: 'boolean'
          },
          excludeTrailingPunctuationFromURLs: {
            defaultValue: false,
            describe: 'Excludes trailing punctuation from links generated with autoLinking',
            type: 'boolean'
          },
          literalMidWordUnderscores: {
            defaultValue: false,
            describe: 'Parse midword underscores as literal underscores',
            type: 'boolean'
          },
          literalMidWordAsterisks: {
            defaultValue: false,
            describe: 'Parse midword asterisks as literal asterisks',
            type: 'boolean'
          },
          strikethrough: {
            defaultValue: false,
            describe: 'Turn on/off strikethrough support',
            type: 'boolean'
          },
          tables: {
            defaultValue: false,
            describe: 'Turn on/off tables support',
            type: 'boolean'
          },
          tablesHeaderId: {
            defaultValue: false,
            describe: 'Add an id to table headers',
            type: 'boolean'
          },
          ghCodeBlocks: {
            defaultValue: true,
            describe: 'Turn on/off GFM fenced code blocks support',
            type: 'boolean'
          },
          tasklists: {
            defaultValue: false,
            describe: 'Turn on/off GFM tasklist support',
            type: 'boolean'
          },
          smoothLivePreview: {
            defaultValue: false,
            describe: 'Prevents weird effects in live previews due to incomplete input',
            type: 'boolean'
          },
          smartIndentationFix: {
            defaultValue: false,
            describe: 'Tries to smartly fix indentation in es6 strings',
            type: 'boolean'
          },
          disableForced4SpacesIndentedSublists: {
            defaultValue: false,
            describe: 'Disables the requirement of indenting nested sublists by 4 spaces',
            type: 'boolean'
          },
          simpleLineBreaks: {
            defaultValue: false,
            describe: 'Parses simple line breaks as <br> (GFM Style)',
            type: 'boolean'
          },
          requireSpaceBeforeHeadingText: {
            defaultValue: false,
            describe: 'Makes adding a space between `#` and the header text mandatory (GFM Style)',
            type: 'boolean'
          },
          ghMentions: {
            defaultValue: false,
            describe: 'Enables github @mentions',
            type: 'boolean'
          },
          ghMentionsLink: {
            defaultValue: 'https://github.com/{u}',
            describe: 'Changes the link generated by @mentions. Only applies if ghMentions option is enabled.',
            type: 'string'
          },
          encodeEmails: {
            defaultValue: true,
            describe: 'Encode e-mail addresses through the use of Character Entities, transforming ASCII e-mail addresses into its equivalent decimal entities',
            type: 'boolean'
          },
          openLinksInNewWindow: {
            defaultValue: false,
            describe: 'Open all links in new windows',
            type: 'boolean'
          },
          backslashEscapesHTMLTags: {
            defaultValue: false,
            describe: 'Support for HTML Tag escaping. ex: \<div>foo\</div>',
            type: 'boolean'
          },
          emoji: {
            defaultValue: false,
            describe: 'Enable emoji support. Ex: `this is a :smile: emoji`',
            type: 'boolean'
          },
          underline: {
            defaultValue: false,
            describe: 'Enable support for underline. Syntax is double or triple underscores: `__underline word__`. With this option enabled, underscores no longer parses into `<em>` and `<strong>`',
            type: 'boolean'
          },
          ellipsis: {
            defaultValue: true,
            describe: 'Replaces three dots with the ellipsis unicode character',
            type: 'boolean'
          },
          completeHTMLDocument: {
            defaultValue: false,
            describe: 'Outputs a complete html document, including `<html>`, `<head>` and `<body>` tags',
            type: 'boolean'
          },
          metadata: {
            defaultValue: false,
            describe: 'Enable support for document metadata (defined at the top of the document between `«««` and `»»»` or between `---` and `---`).',
            type: 'boolean'
          },
          splitAdjacentBlockquotes: {
            defaultValue: false,
            describe: 'Split adjacent blockquote blocks',
            type: 'boolean'
          }
        };
        if (simple === false) {
          return JSON.parse(JSON.stringify(defaultOptions));
        }
        var ret = {};
        for (var opt in defaultOptions) {
          if (defaultOptions.hasOwnProperty(opt)) {
            ret[opt] = defaultOptions[opt].defaultValue;
          }
        }
        return ret;
      }
      function allOptionsOn() {

        var options = getDefaultOpts(true),
          ret = {};
        for (var opt in options) {
          if (options.hasOwnProperty(opt)) {
            ret[opt] = true;
          }
        }
        return ret;
      }

      /**
       * Created by Tivie on 06-01-2015.
       */

      // Private properties
      var showdown = {},
        parsers = {},
        extensions = {},
        globalOptions = getDefaultOpts(true),
        setFlavor = 'vanilla',
        flavor = {
          github: {
            omitExtraWLInCodeBlocks: true,
            simplifiedAutoLink: true,
            excludeTrailingPunctuationFromURLs: true,
            literalMidWordUnderscores: true,
            strikethrough: true,
            tables: true,
            tablesHeaderId: true,
            ghCodeBlocks: true,
            tasklists: true,
            disableForced4SpacesIndentedSublists: true,
            simpleLineBreaks: true,
            requireSpaceBeforeHeadingText: true,
            ghCompatibleHeaderId: true,
            ghMentions: true,
            backslashEscapesHTMLTags: true,
            emoji: true,
            splitAdjacentBlockquotes: true
          },
          original: {
            noHeaderId: true,
            ghCodeBlocks: false
          },
          ghost: {
            omitExtraWLInCodeBlocks: true,
            parseImgDimensions: true,
            simplifiedAutoLink: true,
            excludeTrailingPunctuationFromURLs: true,
            literalMidWordUnderscores: true,
            strikethrough: true,
            tables: true,
            tablesHeaderId: true,
            ghCodeBlocks: true,
            tasklists: true,
            smoothLivePreview: true,
            simpleLineBreaks: true,
            requireSpaceBeforeHeadingText: true,
            ghMentions: false,
            encodeEmails: true
          },
          vanilla: getDefaultOpts(true),
          allOn: allOptionsOn()
        };

      /**
       * helper namespace
       * @type {{}}
       */
      showdown.helper = {};

      /**
       * TODO LEGACY SUPPORT CODE
       * @type {{}}
       */
      showdown.extensions = {};

      /**
       * Set a global option
       * @static
       * @param {string} key
       * @param {*} value
       * @returns {showdown}
       */
      showdown.setOption = function (key, value) {

        globalOptions[key] = value;
        return this;
      };

      /**
       * Get a global option
       * @static
       * @param {string} key
       * @returns {*}
       */
      showdown.getOption = function (key) {

        return globalOptions[key];
      };

      /**
       * Get the global options
       * @static
       * @returns {{}}
       */
      showdown.getOptions = function () {

        return globalOptions;
      };

      /**
       * Reset global options to the default values
       * @static
       */
      showdown.resetOptions = function () {

        globalOptions = getDefaultOpts(true);
      };

      /**
       * Set the flavor showdown should use as default
       * @param {string} name
       */
      showdown.setFlavor = function (name) {

        if (!flavor.hasOwnProperty(name)) {
          throw Error(name + ' flavor was not found');
        }
        showdown.resetOptions();
        var preset = flavor[name];
        setFlavor = name;
        for (var option in preset) {
          if (preset.hasOwnProperty(option)) {
            globalOptions[option] = preset[option];
          }
        }
      };

      /**
       * Get the currently set flavor
       * @returns {string}
       */
      showdown.getFlavor = function () {

        return setFlavor;
      };

      /**
       * Get the options of a specified flavor. Returns undefined if the flavor was not found
       * @param {string} name Name of the flavor
       * @returns {{}|undefined}
       */
      showdown.getFlavorOptions = function (name) {

        if (flavor.hasOwnProperty(name)) {
          return flavor[name];
        }
      };

      /**
       * Get the default options
       * @static
       * @param {boolean} [simple=true]
       * @returns {{}}
       */
      showdown.getDefaultOptions = function (simple) {

        return getDefaultOpts(simple);
      };

      /**
       * Get or set a subParser
       *
       * subParser(name)       - Get a registered subParser
       * subParser(name, func) - Register a subParser
       * @static
       * @param {string} name
       * @param {function} [func]
       * @returns {*}
       */
      showdown.subParser = function (name, func) {

        if (showdown.helper.isString(name)) {
          if (typeof func !== 'undefined') {
            parsers[name] = func;
          } else {
            if (parsers.hasOwnProperty(name)) {
              return parsers[name];
            } else {
              throw Error('SubParser named ' + name + ' not registered!');
            }
          }
        }
      };

      /**
       * Gets or registers an extension
       * @static
       * @param {string} name
       * @param {object|object[]|function=} ext
       * @returns {*}
       */
      showdown.extension = function (name, ext) {

        if (!showdown.helper.isString(name)) {
          throw Error('Extension \'name\' must be a string');
        }
        name = showdown.helper.stdExtName(name);

        // Getter
        if (showdown.helper.isUndefined(ext)) {
          if (!extensions.hasOwnProperty(name)) {
            throw Error('Extension named ' + name + ' is not registered!');
          }
          return extensions[name];

          // Setter
        } else {
          // Expand extension if it's wrapped in a function
          if (typeof ext === 'function') {
            ext = ext();
          }

          // Ensure extension is an array
          if (!showdown.helper.isArray(ext)) {
            ext = [ext];
          }
          var validExtension = validate(ext, name);
          if (validExtension.valid) {
            extensions[name] = ext;
          } else {
            throw Error(validExtension.error);
          }
        }
      };

      /**
       * Gets all extensions registered
       * @returns {{}}
       */
      showdown.getAllExtensions = function () {

        return extensions;
      };

      /**
       * Remove an extension
       * @param {string} name
       */
      showdown.removeExtension = function (name) {

        delete extensions[name];
      };

      /**
       * Removes all extensions
       */
      showdown.resetExtensions = function () {

        extensions = {};
      };

      /**
       * Validate extension
       * @param {array} extension
       * @param {string} name
       * @returns {{valid: boolean, error: string}}
       */
      function validate(extension, name) {

        var errMsg = name ? 'Error in ' + name + ' extension->' : 'Error in unnamed extension',
          ret = {
            valid: true,
            error: ''
          };
        if (!showdown.helper.isArray(extension)) {
          extension = [extension];
        }
        for (var i = 0; i < extension.length; ++i) {
          var baseMsg = errMsg + ' sub-extension ' + i + ': ',
            ext = extension[i];
          if (typeof ext !== 'object') {
            ret.valid = false;
            ret.error = baseMsg + 'must be an object, but ' + typeof ext + ' given';
            return ret;
          }
          if (!showdown.helper.isString(ext.type)) {
            ret.valid = false;
            ret.error = baseMsg + 'property "type" must be a string, but ' + typeof ext.type + ' given';
            return ret;
          }
          var type = ext.type = ext.type.toLowerCase();

          // normalize extension type
          if (type === 'language') {
            type = ext.type = 'lang';
          }
          if (type === 'html') {
            type = ext.type = 'output';
          }
          if (type !== 'lang' && type !== 'output' && type !== 'listener') {
            ret.valid = false;
            ret.error = baseMsg + 'type ' + type + ' is not recognized. Valid values: "lang/language", "output/html" or "listener"';
            return ret;
          }
          if (type === 'listener') {
            if (showdown.helper.isUndefined(ext.listeners)) {
              ret.valid = false;
              ret.error = baseMsg + '. Extensions of type "listener" must have a property called "listeners"';
              return ret;
            }
          } else {
            if (showdown.helper.isUndefined(ext.filter) && showdown.helper.isUndefined(ext.regex)) {
              ret.valid = false;
              ret.error = baseMsg + type + ' extensions must define either a "regex" property or a "filter" method';
              return ret;
            }
          }
          if (ext.listeners) {
            if (typeof ext.listeners !== 'object') {
              ret.valid = false;
              ret.error = baseMsg + '"listeners" property must be an object but ' + typeof ext.listeners + ' given';
              return ret;
            }
            for (var ln in ext.listeners) {
              if (ext.listeners.hasOwnProperty(ln)) {
                if (typeof ext.listeners[ln] !== 'function') {
                  ret.valid = false;
                  ret.error = baseMsg + '"listeners" property must be an hash of [event name]: [callback]. listeners.' + ln + ' must be a function but ' + typeof ext.listeners[ln] + ' given';
                  return ret;
                }
              }
            }
          }
          if (ext.filter) {
            if (typeof ext.filter !== 'function') {
              ret.valid = false;
              ret.error = baseMsg + '"filter" must be a function, but ' + typeof ext.filter + ' given';
              return ret;
            }
          } else if (ext.regex) {
            if (showdown.helper.isString(ext.regex)) {
              ext.regex = new RegExp(ext.regex, 'g');
            }
            if (!(ext.regex instanceof RegExp)) {
              ret.valid = false;
              ret.error = baseMsg + '"regex" property must either be a string or a RegExp object, but ' + typeof ext.regex + ' given';
              return ret;
            }
            if (showdown.helper.isUndefined(ext.replace)) {
              ret.valid = false;
              ret.error = baseMsg + '"regex" extensions must implement a replace string or function';
              return ret;
            }
          }
        }
        return ret;
      }

      /**
       * Validate extension
       * @param {object} ext
       * @returns {boolean}
       */
      showdown.validateExtension = function (ext) {

        var validateExtension = validate(ext, null);
        if (!validateExtension.valid) {
          console.warn(validateExtension.error);
          return false;
        }
        return true;
      };

      /**
       * showdownjs helper functions
       */

      if (!showdown.hasOwnProperty('helper')) {
        showdown.helper = {};
      }

      /**
       * Check if var is string
       * @static
       * @param {string} a
       * @returns {boolean}
       */
      showdown.helper.isString = function (a) {

        return typeof a === 'string' || a instanceof String;
      };

      /**
       * Check if var is a function
       * @static
       * @param {*} a
       * @returns {boolean}
       */
      showdown.helper.isFunction = function (a) {

        var getType = {};
        return a && getType.toString.call(a) === '[object Function]';
      };

      /**
       * isArray helper function
       * @static
       * @param {*} a
       * @returns {boolean}
       */
      showdown.helper.isArray = function (a) {

        return Array.isArray(a);
      };

      /**
       * Check if value is undefined
       * @static
       * @param {*} value The value to check.
       * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
       */
      showdown.helper.isUndefined = function (value) {

        return typeof value === 'undefined';
      };

      /**
       * ForEach helper function
       * Iterates over Arrays and Objects (own properties only)
       * @static
       * @param {*} obj
       * @param {function} callback Accepts 3 params: 1. value, 2. key, 3. the original array/object
       */
      showdown.helper.forEach = function (obj, callback) {

        // check if obj is defined
        if (showdown.helper.isUndefined(obj)) {
          throw new Error('obj param is required');
        }
        if (showdown.helper.isUndefined(callback)) {
          throw new Error('callback param is required');
        }
        if (!showdown.helper.isFunction(callback)) {
          throw new Error('callback param must be a function/closure');
        }
        if (typeof obj.forEach === 'function') {
          obj.forEach(callback);
        } else if (showdown.helper.isArray(obj)) {
          for (var i = 0; i < obj.length; i++) {
            callback(obj[i], i, obj);
          }
        } else if (typeof obj === 'object') {
          for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
              callback(obj[prop], prop, obj);
            }
          }
        } else {
          throw new Error('obj does not seem to be an array or an iterable object');
        }
      };

      /**
       * Standardidize extension name
       * @static
       * @param {string} s extension name
       * @returns {string}
       */
      showdown.helper.stdExtName = function (s) {

        return s.replace(/[_?*+\/\\.^-]/g, '').replace(/\s/g, '').toLowerCase();
      };
      function escapeCharactersCallback(wholeMatch, m1) {

        var charCodeToEscape = m1.charCodeAt(0);
        return '¨E' + charCodeToEscape + 'E';
      }

      /**
       * Callback used to escape characters when passing through String.replace
       * @static
       * @param {string} wholeMatch
       * @param {string} m1
       * @returns {string}
       */
      showdown.helper.escapeCharactersCallback = escapeCharactersCallback;

      /**
       * Escape characters in a string
       * @static
       * @param {string} text
       * @param {string} charsToEscape
       * @param {boolean} afterBackslash
       * @returns {XML|string|void|*}
       */
      showdown.helper.escapeCharacters = function (text, charsToEscape, afterBackslash) {

        // First we have to escape the escape characters so that
        // we can build a character class out of them
        var regexString = '([' + charsToEscape.replace(/([\[\]\\])/g, '\\$1') + '])';
        if (afterBackslash) {
          regexString = '\\\\' + regexString;
        }
        var regex = new RegExp(regexString, 'g');
        text = text.replace(regex, escapeCharactersCallback);
        return text;
      };

      /**
       * Unescape HTML entities
       * @param txt
       * @returns {string}
       */
      showdown.helper.unescapeHTMLEntities = function (txt) {

        return txt.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      };
      var rgxFindMatchPos = function (str, left, right, flags) {

        var f = flags || '',
          g = f.indexOf('g') > -1,
          x = new RegExp(left + '|' + right, 'g' + f.replace(/g/g, '')),
          l = new RegExp(left, f.replace(/g/g, '')),
          pos = [],
          t,
          s,
          m,
          start,
          end;
        do {
          t = 0;
          while (m = x.exec(str)) {
            if (l.test(m[0])) {
              if (!t++) {
                s = x.lastIndex;
                start = s - m[0].length;
              }
            } else if (t) {
              if (! --t) {
                end = m.index + m[0].length;
                var obj = {
                  left: {
                    start: start,
                    end: s
                  },
                  match: {
                    start: s,
                    end: m.index
                  },
                  right: {
                    start: m.index,
                    end: end
                  },
                  wholeMatch: {
                    start: start,
                    end: end
                  }
                };
                pos.push(obj);
                if (!g) {
                  return pos;
                }
              }
            }
          }
        } while (t && (x.lastIndex = s));
        return pos;
      };

      /**
       * matchRecursiveRegExp
       *
       * (c) 2007 Steven Levithan <stevenlevithan.com>
       * MIT License
       *
       * Accepts a string to search, a left and right format delimiter
       * as regex patterns, and optional regex flags. Returns an array
       * of matches, allowing nested instances of left/right delimiters.
       * Use the "g" flag to return all matches, otherwise only the
       * first is returned. Be careful to ensure that the left and
       * right format delimiters produce mutually exclusive matches.
       * Backreferences are not supported within the right delimiter
       * due to how it is internally combined with the left delimiter.
       * When matching strings whose format delimiters are unbalanced
       * to the left or right, the output is intentionally as a
       * conventional regex library with recursion support would
       * produce, e.g. "<<x>" and "<x>>" both produce ["x"] when using
       * "<" and ">" as the delimiters (both strings contain a single,
       * balanced instance of "<x>").
       *
       * examples:
       * matchRecursiveRegExp("test", "\\(", "\\)")
       * returns: []
       * matchRecursiveRegExp("<t<<e>><s>>t<>", "<", ">", "g")
       * returns: ["t<<e>><s>", ""]
       * matchRecursiveRegExp("<div id=\"x\">test</div>", "<div\\b[^>]*>", "</div>", "gi")
       * returns: ["test"]
       */
      showdown.helper.matchRecursiveRegExp = function (str, left, right, flags) {

        var matchPos = rgxFindMatchPos(str, left, right, flags),
          results = [];
        for (var i = 0; i < matchPos.length; ++i) {
          results.push([str.slice(matchPos[i].wholeMatch.start, matchPos[i].wholeMatch.end), str.slice(matchPos[i].match.start, matchPos[i].match.end), str.slice(matchPos[i].left.start, matchPos[i].left.end), str.slice(matchPos[i].right.start, matchPos[i].right.end)]);
        }
        return results;
      };

      /**
       *
       * @param {string} str
       * @param {string|function} replacement
       * @param {string} left
       * @param {string} right
       * @param {string} flags
       * @returns {string}
       */
      showdown.helper.replaceRecursiveRegExp = function (str, replacement, left, right, flags) {

        if (!showdown.helper.isFunction(replacement)) {
          var repStr = replacement;
          replacement = function () {
            return repStr;
          };
        }
        var matchPos = rgxFindMatchPos(str, left, right, flags),
          finalStr = str,
          lng = matchPos.length;
        if (lng > 0) {
          var bits = [];
          if (matchPos[0].wholeMatch.start !== 0) {
            bits.push(str.slice(0, matchPos[0].wholeMatch.start));
          }
          for (var i = 0; i < lng; ++i) {
            bits.push(replacement(str.slice(matchPos[i].wholeMatch.start, matchPos[i].wholeMatch.end), str.slice(matchPos[i].match.start, matchPos[i].match.end), str.slice(matchPos[i].left.start, matchPos[i].left.end), str.slice(matchPos[i].right.start, matchPos[i].right.end)));
            if (i < lng - 1) {
              bits.push(str.slice(matchPos[i].wholeMatch.end, matchPos[i + 1].wholeMatch.start));
            }
          }
          if (matchPos[lng - 1].wholeMatch.end < str.length) {
            bits.push(str.slice(matchPos[lng - 1].wholeMatch.end));
          }
          finalStr = bits.join('');
        }
        return finalStr;
      };

      /**
       * Returns the index within the passed String object of the first occurrence of the specified regex,
       * starting the search at fromIndex. Returns -1 if the value is not found.
       *
       * @param {string} str string to search
       * @param {RegExp} regex Regular expression to search
       * @param {int} [fromIndex = 0] Index to start the search
       * @returns {Number}
       * @throws InvalidArgumentError
       */
      showdown.helper.regexIndexOf = function (str, regex, fromIndex) {

        if (!showdown.helper.isString(str)) {
          throw 'InvalidArgumentError: first parameter of showdown.helper.regexIndexOf function must be a string';
        }
        if (regex instanceof RegExp === false) {
          throw 'InvalidArgumentError: second parameter of showdown.helper.regexIndexOf function must be an instance of RegExp';
        }
        var indexOf = str.substring(fromIndex || 0).search(regex);
        return indexOf >= 0 ? indexOf + (fromIndex || 0) : indexOf;
      };

      /**
       * Splits the passed string object at the defined index, and returns an array composed of the two substrings
       * @param {string} str string to split
       * @param {int} index index to split string at
       * @returns {[string,string]}
       * @throws InvalidArgumentError
       */
      showdown.helper.splitAtIndex = function (str, index) {

        if (!showdown.helper.isString(str)) {
          throw 'InvalidArgumentError: first parameter of showdown.helper.regexIndexOf function must be a string';
        }
        return [str.substring(0, index), str.substring(index)];
      };

      /**
       * Obfuscate an e-mail address through the use of Character Entities,
       * transforming ASCII characters into their equivalent decimal or hex entities.
       *
       * Since it has a random component, subsequent calls to this function produce different results
       *
       * @param {string} mail
       * @returns {string}
       */
      showdown.helper.encodeEmailAddress = function (mail) {

        var encode = [function (ch) {
          return '&#' + ch.charCodeAt(0) + ';';
        }, function (ch) {
          return '&#x' + ch.charCodeAt(0).toString(16) + ';';
        }, function (ch) {
          return ch;
        }];
        mail = mail.replace(/./g, function (ch) {
          if (ch === '@') {
            // this *must* be encoded. I insist.
            ch = encode[Math.floor(Math.random() * 2)](ch);
          } else {
            var r = Math.random();
            // roughly 10% raw, 45% hex, 45% dec
            ch = r > 0.9 ? encode[2](ch) : r > 0.45 ? encode[1](ch) : encode[0](ch);
          }
          return ch;
        });
        return mail;
      };

      /**
       *
       * @param str
       * @param targetLength
       * @param padString
       * @returns {string}
       */
      showdown.helper.padEnd = function padEnd(str, targetLength, padString) {

        /*jshint bitwise: false*/
        // eslint-disable-next-line space-infix-ops
        targetLength = targetLength >> 0; //floor if number or convert non-number to 0;
        /*jshint bitwise: true*/
        padString = String(padString || ' ');
        if (str.length > targetLength) {
          return String(str);
        } else {
          targetLength = targetLength - str.length;
          if (targetLength > padString.length) {
            padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
          }

          return String(str) + padString.slice(0, targetLength);
        }
      };

      /**
       * POLYFILLS
       */
      // use this instead of builtin is undefined for IE8 compatibility
      if (typeof console === 'undefined') {
        console = {
          warn: function (msg) {

            alert(msg);
          },
          log: function (msg) {

            alert(msg);
          },
          error: function (msg) {

            throw msg;
          }
        };
      }

      /**
       * Common regexes.
       * We declare some common regexes to improve performance
       */
      showdown.helper.regexes = {
        asteriskDashAndColon: /([*_:~])/g
      };

      /**
       * EMOJIS LIST
       */
      showdown.helper.emojis = {
        '+1': '\ud83d\udc4d',
        '-1': '\ud83d\udc4e',
        '100': '\ud83d\udcaf',
        '1234': '\ud83d\udd22',
        '1st_place_medal': '\ud83e\udd47',
        '2nd_place_medal': '\ud83e\udd48',
        '3rd_place_medal': '\ud83e\udd49',
        '8ball': '\ud83c\udfb1',
        'a': '\ud83c\udd70\ufe0f',
        'ab': '\ud83c\udd8e',
        'abc': '\ud83d\udd24',
        'abcd': '\ud83d\udd21',
        'accept': '\ud83c\ude51',
        'aerial_tramway': '\ud83d\udea1',
        'airplane': '\u2708\ufe0f',
        'alarm_clock': '\u23f0',
        'alembic': '\u2697\ufe0f',
        'alien': '\ud83d\udc7d',
        'ambulance': '\ud83d\ude91',
        'amphora': '\ud83c\udffa',
        'anchor': '\u2693\ufe0f',
        'angel': '\ud83d\udc7c',
        'anger': '\ud83d\udca2',
        'angry': '\ud83d\ude20',
        'anguished': '\ud83d\ude27',
        'ant': '\ud83d\udc1c',
        'apple': '\ud83c\udf4e',
        'aquarius': '\u2652\ufe0f',
        'aries': '\u2648\ufe0f',
        'arrow_backward': '\u25c0\ufe0f',
        'arrow_double_down': '\u23ec',
        'arrow_double_up': '\u23eb',
        'arrow_down': '\u2b07\ufe0f',
        'arrow_down_small': '\ud83d\udd3d',
        'arrow_forward': '\u25b6\ufe0f',
        'arrow_heading_down': '\u2935\ufe0f',
        'arrow_heading_up': '\u2934\ufe0f',
        'arrow_left': '\u2b05\ufe0f',
        'arrow_lower_left': '\u2199\ufe0f',
        'arrow_lower_right': '\u2198\ufe0f',
        'arrow_right': '\u27a1\ufe0f',
        'arrow_right_hook': '\u21aa\ufe0f',
        'arrow_up': '\u2b06\ufe0f',
        'arrow_up_down': '\u2195\ufe0f',
        'arrow_up_small': '\ud83d\udd3c',
        'arrow_upper_left': '\u2196\ufe0f',
        'arrow_upper_right': '\u2197\ufe0f',
        'arrows_clockwise': '\ud83d\udd03',
        'arrows_counterclockwise': '\ud83d\udd04',
        'art': '\ud83c\udfa8',
        'articulated_lorry': '\ud83d\ude9b',
        'artificial_satellite': '\ud83d\udef0',
        'astonished': '\ud83d\ude32',
        'athletic_shoe': '\ud83d\udc5f',
        'atm': '\ud83c\udfe7',
        'atom_symbol': '\u269b\ufe0f',
        'avocado': '\ud83e\udd51',
        'b': '\ud83c\udd71\ufe0f',
        'baby': '\ud83d\udc76',
        'baby_bottle': '\ud83c\udf7c',
        'baby_chick': '\ud83d\udc24',
        'baby_symbol': '\ud83d\udebc',
        'back': '\ud83d\udd19',
        'bacon': '\ud83e\udd53',
        'badminton': '\ud83c\udff8',
        'baggage_claim': '\ud83d\udec4',
        'baguette_bread': '\ud83e\udd56',
        'balance_scale': '\u2696\ufe0f',
        'balloon': '\ud83c\udf88',
        'ballot_box': '\ud83d\uddf3',
        'ballot_box_with_check': '\u2611\ufe0f',
        'bamboo': '\ud83c\udf8d',
        'banana': '\ud83c\udf4c',
        'bangbang': '\u203c\ufe0f',
        'bank': '\ud83c\udfe6',
        'bar_chart': '\ud83d\udcca',
        'barber': '\ud83d\udc88',
        'baseball': '\u26be\ufe0f',
        'basketball': '\ud83c\udfc0',
        'basketball_man': '\u26f9\ufe0f',
        'basketball_woman': '\u26f9\ufe0f&zwj;\u2640\ufe0f',
        'bat': '\ud83e\udd87',
        'bath': '\ud83d\udec0',
        'bathtub': '\ud83d\udec1',
        'battery': '\ud83d\udd0b',
        'beach_umbrella': '\ud83c\udfd6',
        'bear': '\ud83d\udc3b',
        'bed': '\ud83d\udecf',
        'bee': '\ud83d\udc1d',
        'beer': '\ud83c\udf7a',
        'beers': '\ud83c\udf7b',
        'beetle': '\ud83d\udc1e',
        'beginner': '\ud83d\udd30',
        'bell': '\ud83d\udd14',
        'bellhop_bell': '\ud83d\udece',
        'bento': '\ud83c\udf71',
        'biking_man': '\ud83d\udeb4',
        'bike': '\ud83d\udeb2',
        'biking_woman': '\ud83d\udeb4&zwj;\u2640\ufe0f',
        'bikini': '\ud83d\udc59',
        'biohazard': '\u2623\ufe0f',
        'bird': '\ud83d\udc26',
        'birthday': '\ud83c\udf82',
        'black_circle': '\u26ab\ufe0f',
        'black_flag': '\ud83c\udff4',
        'black_heart': '\ud83d\udda4',
        'black_joker': '\ud83c\udccf',
        'black_large_square': '\u2b1b\ufe0f',
        'black_medium_small_square': '\u25fe\ufe0f',
        'black_medium_square': '\u25fc\ufe0f',
        'black_nib': '\u2712\ufe0f',
        'black_small_square': '\u25aa\ufe0f',
        'black_square_button': '\ud83d\udd32',
        'blonde_man': '\ud83d\udc71',
        'blonde_woman': '\ud83d\udc71&zwj;\u2640\ufe0f',
        'blossom': '\ud83c\udf3c',
        'blowfish': '\ud83d\udc21',
        'blue_book': '\ud83d\udcd8',
        'blue_car': '\ud83d\ude99',
        'blue_heart': '\ud83d\udc99',
        'blush': '\ud83d\ude0a',
        'boar': '\ud83d\udc17',
        'boat': '\u26f5\ufe0f',
        'bomb': '\ud83d\udca3',
        'book': '\ud83d\udcd6',
        'bookmark': '\ud83d\udd16',
        'bookmark_tabs': '\ud83d\udcd1',
        'books': '\ud83d\udcda',
        'boom': '\ud83d\udca5',
        'boot': '\ud83d\udc62',
        'bouquet': '\ud83d\udc90',
        'bowing_man': '\ud83d\ude47',
        'bow_and_arrow': '\ud83c\udff9',
        'bowing_woman': '\ud83d\ude47&zwj;\u2640\ufe0f',
        'bowling': '\ud83c\udfb3',
        'boxing_glove': '\ud83e\udd4a',
        'boy': '\ud83d\udc66',
        'bread': '\ud83c\udf5e',
        'bride_with_veil': '\ud83d\udc70',
        'bridge_at_night': '\ud83c\udf09',
        'briefcase': '\ud83d\udcbc',
        'broken_heart': '\ud83d\udc94',
        'bug': '\ud83d\udc1b',
        'building_construction': '\ud83c\udfd7',
        'bulb': '\ud83d\udca1',
        'bullettrain_front': '\ud83d\ude85',
        'bullettrain_side': '\ud83d\ude84',
        'burrito': '\ud83c\udf2f',
        'bus': '\ud83d\ude8c',
        'business_suit_levitating': '\ud83d\udd74',
        'busstop': '\ud83d\ude8f',
        'bust_in_silhouette': '\ud83d\udc64',
        'busts_in_silhouette': '\ud83d\udc65',
        'butterfly': '\ud83e\udd8b',
        'cactus': '\ud83c\udf35',
        'cake': '\ud83c\udf70',
        'calendar': '\ud83d\udcc6',
        'call_me_hand': '\ud83e\udd19',
        'calling': '\ud83d\udcf2',
        'camel': '\ud83d\udc2b',
        'camera': '\ud83d\udcf7',
        'camera_flash': '\ud83d\udcf8',
        'camping': '\ud83c\udfd5',
        'cancer': '\u264b\ufe0f',
        'candle': '\ud83d\udd6f',
        'candy': '\ud83c\udf6c',
        'canoe': '\ud83d\udef6',
        'capital_abcd': '\ud83d\udd20',
        'capricorn': '\u2651\ufe0f',
        'car': '\ud83d\ude97',
        'card_file_box': '\ud83d\uddc3',
        'card_index': '\ud83d\udcc7',
        'card_index_dividers': '\ud83d\uddc2',
        'carousel_horse': '\ud83c\udfa0',
        'carrot': '\ud83e\udd55',
        'cat': '\ud83d\udc31',
        'cat2': '\ud83d\udc08',
        'cd': '\ud83d\udcbf',
        'chains': '\u26d3',
        'champagne': '\ud83c\udf7e',
        'chart': '\ud83d\udcb9',
        'chart_with_downwards_trend': '\ud83d\udcc9',
        'chart_with_upwards_trend': '\ud83d\udcc8',
        'checkered_flag': '\ud83c\udfc1',
        'cheese': '\ud83e\uddc0',
        'cherries': '\ud83c\udf52',
        'cherry_blossom': '\ud83c\udf38',
        'chestnut': '\ud83c\udf30',
        'chicken': '\ud83d\udc14',
        'children_crossing': '\ud83d\udeb8',
        'chipmunk': '\ud83d\udc3f',
        'chocolate_bar': '\ud83c\udf6b',
        'christmas_tree': '\ud83c\udf84',
        'church': '\u26ea\ufe0f',
        'cinema': '\ud83c\udfa6',
        'circus_tent': '\ud83c\udfaa',
        'city_sunrise': '\ud83c\udf07',
        'city_sunset': '\ud83c\udf06',
        'cityscape': '\ud83c\udfd9',
        'cl': '\ud83c\udd91',
        'clamp': '\ud83d\udddc',
        'clap': '\ud83d\udc4f',
        'clapper': '\ud83c\udfac',
        'classical_building': '\ud83c\udfdb',
        'clinking_glasses': '\ud83e\udd42',
        'clipboard': '\ud83d\udccb',
        'clock1': '\ud83d\udd50',
        'clock10': '\ud83d\udd59',
        'clock1030': '\ud83d\udd65',
        'clock11': '\ud83d\udd5a',
        'clock1130': '\ud83d\udd66',
        'clock12': '\ud83d\udd5b',
        'clock1230': '\ud83d\udd67',
        'clock130': '\ud83d\udd5c',
        'clock2': '\ud83d\udd51',
        'clock230': '\ud83d\udd5d',
        'clock3': '\ud83d\udd52',
        'clock330': '\ud83d\udd5e',
        'clock4': '\ud83d\udd53',
        'clock430': '\ud83d\udd5f',
        'clock5': '\ud83d\udd54',
        'clock530': '\ud83d\udd60',
        'clock6': '\ud83d\udd55',
        'clock630': '\ud83d\udd61',
        'clock7': '\ud83d\udd56',
        'clock730': '\ud83d\udd62',
        'clock8': '\ud83d\udd57',
        'clock830': '\ud83d\udd63',
        'clock9': '\ud83d\udd58',
        'clock930': '\ud83d\udd64',
        'closed_book': '\ud83d\udcd5',
        'closed_lock_with_key': '\ud83d\udd10',
        'closed_umbrella': '\ud83c\udf02',
        'cloud': '\u2601\ufe0f',
        'cloud_with_lightning': '\ud83c\udf29',
        'cloud_with_lightning_and_rain': '\u26c8',
        'cloud_with_rain': '\ud83c\udf27',
        'cloud_with_snow': '\ud83c\udf28',
        'clown_face': '\ud83e\udd21',
        'clubs': '\u2663\ufe0f',
        'cocktail': '\ud83c\udf78',
        'coffee': '\u2615\ufe0f',
        'coffin': '\u26b0\ufe0f',
        'cold_sweat': '\ud83d\ude30',
        'comet': '\u2604\ufe0f',
        'computer': '\ud83d\udcbb',
        'computer_mouse': '\ud83d\uddb1',
        'confetti_ball': '\ud83c\udf8a',
        'confounded': '\ud83d\ude16',
        'confused': '\ud83d\ude15',
        'congratulations': '\u3297\ufe0f',
        'construction': '\ud83d\udea7',
        'construction_worker_man': '\ud83d\udc77',
        'construction_worker_woman': '\ud83d\udc77&zwj;\u2640\ufe0f',
        'control_knobs': '\ud83c\udf9b',
        'convenience_store': '\ud83c\udfea',
        'cookie': '\ud83c\udf6a',
        'cool': '\ud83c\udd92',
        'policeman': '\ud83d\udc6e',
        'copyright': '\u00a9\ufe0f',
        'corn': '\ud83c\udf3d',
        'couch_and_lamp': '\ud83d\udecb',
        'couple': '\ud83d\udc6b',
        'couple_with_heart_woman_man': '\ud83d\udc91',
        'couple_with_heart_man_man': '\ud83d\udc68&zwj;\u2764\ufe0f&zwj;\ud83d\udc68',
        'couple_with_heart_woman_woman': '\ud83d\udc69&zwj;\u2764\ufe0f&zwj;\ud83d\udc69',
        'couplekiss_man_man': '\ud83d\udc68&zwj;\u2764\ufe0f&zwj;\ud83d\udc8b&zwj;\ud83d\udc68',
        'couplekiss_man_woman': '\ud83d\udc8f',
        'couplekiss_woman_woman': '\ud83d\udc69&zwj;\u2764\ufe0f&zwj;\ud83d\udc8b&zwj;\ud83d\udc69',
        'cow': '\ud83d\udc2e',
        'cow2': '\ud83d\udc04',
        'cowboy_hat_face': '\ud83e\udd20',
        'crab': '\ud83e\udd80',
        'crayon': '\ud83d\udd8d',
        'credit_card': '\ud83d\udcb3',
        'crescent_moon': '\ud83c\udf19',
        'cricket': '\ud83c\udfcf',
        'crocodile': '\ud83d\udc0a',
        'croissant': '\ud83e\udd50',
        'crossed_fingers': '\ud83e\udd1e',
        'crossed_flags': '\ud83c\udf8c',
        'crossed_swords': '\u2694\ufe0f',
        'crown': '\ud83d\udc51',
        'cry': '\ud83d\ude22',
        'crying_cat_face': '\ud83d\ude3f',
        'crystal_ball': '\ud83d\udd2e',
        'cucumber': '\ud83e\udd52',
        'cupid': '\ud83d\udc98',
        'curly_loop': '\u27b0',
        'currency_exchange': '\ud83d\udcb1',
        'curry': '\ud83c\udf5b',
        'custard': '\ud83c\udf6e',
        'customs': '\ud83d\udec3',
        'cyclone': '\ud83c\udf00',
        'dagger': '\ud83d\udde1',
        'dancer': '\ud83d\udc83',
        'dancing_women': '\ud83d\udc6f',
        'dancing_men': '\ud83d\udc6f&zwj;\u2642\ufe0f',
        'dango': '\ud83c\udf61',
        'dark_sunglasses': '\ud83d\udd76',
        'dart': '\ud83c\udfaf',
        'dash': '\ud83d\udca8',
        'date': '\ud83d\udcc5',
        'deciduous_tree': '\ud83c\udf33',
        'deer': '\ud83e\udd8c',
        'department_store': '\ud83c\udfec',
        'derelict_house': '\ud83c\udfda',
        'desert': '\ud83c\udfdc',
        'desert_island': '\ud83c\udfdd',
        'desktop_computer': '\ud83d\udda5',
        'male_detective': '\ud83d\udd75\ufe0f',
        'diamond_shape_with_a_dot_inside': '\ud83d\udca0',
        'diamonds': '\u2666\ufe0f',
        'disappointed': '\ud83d\ude1e',
        'disappointed_relieved': '\ud83d\ude25',
        'dizzy': '\ud83d\udcab',
        'dizzy_face': '\ud83d\ude35',
        'do_not_litter': '\ud83d\udeaf',
        'dog': '\ud83d\udc36',
        'dog2': '\ud83d\udc15',
        'dollar': '\ud83d\udcb5',
        'dolls': '\ud83c\udf8e',
        'dolphin': '\ud83d\udc2c',
        'door': '\ud83d\udeaa',
        'doughnut': '\ud83c\udf69',
        'dove': '\ud83d\udd4a',
        'dragon': '\ud83d\udc09',
        'dragon_face': '\ud83d\udc32',
        'dress': '\ud83d\udc57',
        'dromedary_camel': '\ud83d\udc2a',
        'drooling_face': '\ud83e\udd24',
        'droplet': '\ud83d\udca7',
        'drum': '\ud83e\udd41',
        'duck': '\ud83e\udd86',
        'dvd': '\ud83d\udcc0',
        'e-mail': '\ud83d\udce7',
        'eagle': '\ud83e\udd85',
        'ear': '\ud83d\udc42',
        'ear_of_rice': '\ud83c\udf3e',
        'earth_africa': '\ud83c\udf0d',
        'earth_americas': '\ud83c\udf0e',
        'earth_asia': '\ud83c\udf0f',
        'egg': '\ud83e\udd5a',
        'eggplant': '\ud83c\udf46',
        'eight_pointed_black_star': '\u2734\ufe0f',
        'eight_spoked_asterisk': '\u2733\ufe0f',
        'electric_plug': '\ud83d\udd0c',
        'elephant': '\ud83d\udc18',
        'email': '\u2709\ufe0f',
        'end': '\ud83d\udd1a',
        'envelope_with_arrow': '\ud83d\udce9',
        'euro': '\ud83d\udcb6',
        'european_castle': '\ud83c\udff0',
        'european_post_office': '\ud83c\udfe4',
        'evergreen_tree': '\ud83c\udf32',
        'exclamation': '\u2757\ufe0f',
        'expressionless': '\ud83d\ude11',
        'eye': '\ud83d\udc41',
        'eye_speech_bubble': '\ud83d\udc41&zwj;\ud83d\udde8',
        'eyeglasses': '\ud83d\udc53',
        'eyes': '\ud83d\udc40',
        'face_with_head_bandage': '\ud83e\udd15',
        'face_with_thermometer': '\ud83e\udd12',
        'fist_oncoming': '\ud83d\udc4a',
        'factory': '\ud83c\udfed',
        'fallen_leaf': '\ud83c\udf42',
        'family_man_woman_boy': '\ud83d\udc6a',
        'family_man_boy': '\ud83d\udc68&zwj;\ud83d\udc66',
        'family_man_boy_boy': '\ud83d\udc68&zwj;\ud83d\udc66&zwj;\ud83d\udc66',
        'family_man_girl': '\ud83d\udc68&zwj;\ud83d\udc67',
        'family_man_girl_boy': '\ud83d\udc68&zwj;\ud83d\udc67&zwj;\ud83d\udc66',
        'family_man_girl_girl': '\ud83d\udc68&zwj;\ud83d\udc67&zwj;\ud83d\udc67',
        'family_man_man_boy': '\ud83d\udc68&zwj;\ud83d\udc68&zwj;\ud83d\udc66',
        'family_man_man_boy_boy': '\ud83d\udc68&zwj;\ud83d\udc68&zwj;\ud83d\udc66&zwj;\ud83d\udc66',
        'family_man_man_girl': '\ud83d\udc68&zwj;\ud83d\udc68&zwj;\ud83d\udc67',
        'family_man_man_girl_boy': '\ud83d\udc68&zwj;\ud83d\udc68&zwj;\ud83d\udc67&zwj;\ud83d\udc66',
        'family_man_man_girl_girl': '\ud83d\udc68&zwj;\ud83d\udc68&zwj;\ud83d\udc67&zwj;\ud83d\udc67',
        'family_man_woman_boy_boy': '\ud83d\udc68&zwj;\ud83d\udc69&zwj;\ud83d\udc66&zwj;\ud83d\udc66',
        'family_man_woman_girl': '\ud83d\udc68&zwj;\ud83d\udc69&zwj;\ud83d\udc67',
        'family_man_woman_girl_boy': '\ud83d\udc68&zwj;\ud83d\udc69&zwj;\ud83d\udc67&zwj;\ud83d\udc66',
        'family_man_woman_girl_girl': '\ud83d\udc68&zwj;\ud83d\udc69&zwj;\ud83d\udc67&zwj;\ud83d\udc67',
        'family_woman_boy': '\ud83d\udc69&zwj;\ud83d\udc66',
        'family_woman_boy_boy': '\ud83d\udc69&zwj;\ud83d\udc66&zwj;\ud83d\udc66',
        'family_woman_girl': '\ud83d\udc69&zwj;\ud83d\udc67',
        'family_woman_girl_boy': '\ud83d\udc69&zwj;\ud83d\udc67&zwj;\ud83d\udc66',
        'family_woman_girl_girl': '\ud83d\udc69&zwj;\ud83d\udc67&zwj;\ud83d\udc67',
        'family_woman_woman_boy': '\ud83d\udc69&zwj;\ud83d\udc69&zwj;\ud83d\udc66',
        'family_woman_woman_boy_boy': '\ud83d\udc69&zwj;\ud83d\udc69&zwj;\ud83d\udc66&zwj;\ud83d\udc66',
        'family_woman_woman_girl': '\ud83d\udc69&zwj;\ud83d\udc69&zwj;\ud83d\udc67',
        'family_woman_woman_girl_boy': '\ud83d\udc69&zwj;\ud83d\udc69&zwj;\ud83d\udc67&zwj;\ud83d\udc66',
        'family_woman_woman_girl_girl': '\ud83d\udc69&zwj;\ud83d\udc69&zwj;\ud83d\udc67&zwj;\ud83d\udc67',
        'fast_forward': '\u23e9',
        'fax': '\ud83d\udce0',
        'fearful': '\ud83d\ude28',
        'feet': '\ud83d\udc3e',
        'female_detective': '\ud83d\udd75\ufe0f&zwj;\u2640\ufe0f',
        'ferris_wheel': '\ud83c\udfa1',
        'ferry': '\u26f4',
        'field_hockey': '\ud83c\udfd1',
        'file_cabinet': '\ud83d\uddc4',
        'file_folder': '\ud83d\udcc1',
        'film_projector': '\ud83d\udcfd',
        'film_strip': '\ud83c\udf9e',
        'fire': '\ud83d\udd25',
        'fire_engine': '\ud83d\ude92',
        'fireworks': '\ud83c\udf86',
        'first_quarter_moon': '\ud83c\udf13',
        'first_quarter_moon_with_face': '\ud83c\udf1b',
        'fish': '\ud83d\udc1f',
        'fish_cake': '\ud83c\udf65',
        'fishing_pole_and_fish': '\ud83c\udfa3',
        'fist_raised': '\u270a',
        'fist_left': '\ud83e\udd1b',
        'fist_right': '\ud83e\udd1c',
        'flags': '\ud83c\udf8f',
        'flashlight': '\ud83d\udd26',
        'fleur_de_lis': '\u269c\ufe0f',
        'flight_arrival': '\ud83d\udeec',
        'flight_departure': '\ud83d\udeeb',
        'floppy_disk': '\ud83d\udcbe',
        'flower_playing_cards': '\ud83c\udfb4',
        'flushed': '\ud83d\ude33',
        'fog': '\ud83c\udf2b',
        'foggy': '\ud83c\udf01',
        'football': '\ud83c\udfc8',
        'footprints': '\ud83d\udc63',
        'fork_and_knife': '\ud83c\udf74',
        'fountain': '\u26f2\ufe0f',
        'fountain_pen': '\ud83d\udd8b',
        'four_leaf_clover': '\ud83c\udf40',
        'fox_face': '\ud83e\udd8a',
        'framed_picture': '\ud83d\uddbc',
        'free': '\ud83c\udd93',
        'fried_egg': '\ud83c\udf73',
        'fried_shrimp': '\ud83c\udf64',
        'fries': '\ud83c\udf5f',
        'frog': '\ud83d\udc38',
        'frowning': '\ud83d\ude26',
        'frowning_face': '\u2639\ufe0f',
        'frowning_man': '\ud83d\ude4d&zwj;\u2642\ufe0f',
        'frowning_woman': '\ud83d\ude4d',
        'middle_finger': '\ud83d\udd95',
        'fuelpump': '\u26fd\ufe0f',
        'full_moon': '\ud83c\udf15',
        'full_moon_with_face': '\ud83c\udf1d',
        'funeral_urn': '\u26b1\ufe0f',
        'game_die': '\ud83c\udfb2',
        'gear': '\u2699\ufe0f',
        'gem': '\ud83d\udc8e',
        'gemini': '\u264a\ufe0f',
        'ghost': '\ud83d\udc7b',
        'gift': '\ud83c\udf81',
        'gift_heart': '\ud83d\udc9d',
        'girl': '\ud83d\udc67',
        'globe_with_meridians': '\ud83c\udf10',
        'goal_net': '\ud83e\udd45',
        'goat': '\ud83d\udc10',
        'golf': '\u26f3\ufe0f',
        'golfing_man': '\ud83c\udfcc\ufe0f',
        'golfing_woman': '\ud83c\udfcc\ufe0f&zwj;\u2640\ufe0f',
        'gorilla': '\ud83e\udd8d',
        'grapes': '\ud83c\udf47',
        'green_apple': '\ud83c\udf4f',
        'green_book': '\ud83d\udcd7',
        'green_heart': '\ud83d\udc9a',
        'green_salad': '\ud83e\udd57',
        'grey_exclamation': '\u2755',
        'grey_question': '\u2754',
        'grimacing': '\ud83d\ude2c',
        'grin': '\ud83d\ude01',
        'grinning': '\ud83d\ude00',
        'guardsman': '\ud83d\udc82',
        'guardswoman': '\ud83d\udc82&zwj;\u2640\ufe0f',
        'guitar': '\ud83c\udfb8',
        'gun': '\ud83d\udd2b',
        'haircut_woman': '\ud83d\udc87',
        'haircut_man': '\ud83d\udc87&zwj;\u2642\ufe0f',
        'hamburger': '\ud83c\udf54',
        'hammer': '\ud83d\udd28',
        'hammer_and_pick': '\u2692',
        'hammer_and_wrench': '\ud83d\udee0',
        'hamster': '\ud83d\udc39',
        'hand': '\u270b',
        'handbag': '\ud83d\udc5c',
        'handshake': '\ud83e\udd1d',
        'hankey': '\ud83d\udca9',
        'hatched_chick': '\ud83d\udc25',
        'hatching_chick': '\ud83d\udc23',
        'headphones': '\ud83c\udfa7',
        'hear_no_evil': '\ud83d\ude49',
        'heart': '\u2764\ufe0f',
        'heart_decoration': '\ud83d\udc9f',
        'heart_eyes': '\ud83d\ude0d',
        'heart_eyes_cat': '\ud83d\ude3b',
        'heartbeat': '\ud83d\udc93',
        'heartpulse': '\ud83d\udc97',
        'hearts': '\u2665\ufe0f',
        'heavy_check_mark': '\u2714\ufe0f',
        'heavy_division_sign': '\u2797',
        'heavy_dollar_sign': '\ud83d\udcb2',
        'heavy_heart_exclamation': '\u2763\ufe0f',
        'heavy_minus_sign': '\u2796',
        'heavy_multiplication_x': '\u2716\ufe0f',
        'heavy_plus_sign': '\u2795',
        'helicopter': '\ud83d\ude81',
        'herb': '\ud83c\udf3f',
        'hibiscus': '\ud83c\udf3a',
        'high_brightness': '\ud83d\udd06',
        'high_heel': '\ud83d\udc60',
        'hocho': '\ud83d\udd2a',
        'hole': '\ud83d\udd73',
        'honey_pot': '\ud83c\udf6f',
        'horse': '\ud83d\udc34',
        'horse_racing': '\ud83c\udfc7',
        'hospital': '\ud83c\udfe5',
        'hot_pepper': '\ud83c\udf36',
        'hotdog': '\ud83c\udf2d',
        'hotel': '\ud83c\udfe8',
        'hotsprings': '\u2668\ufe0f',
        'hourglass': '\u231b\ufe0f',
        'hourglass_flowing_sand': '\u23f3',
        'house': '\ud83c\udfe0',
        'house_with_garden': '\ud83c\udfe1',
        'houses': '\ud83c\udfd8',
        'hugs': '\ud83e\udd17',
        'hushed': '\ud83d\ude2f',
        'ice_cream': '\ud83c\udf68',
        'ice_hockey': '\ud83c\udfd2',
        'ice_skate': '\u26f8',
        'icecream': '\ud83c\udf66',
        'id': '\ud83c\udd94',
        'ideograph_advantage': '\ud83c\ude50',
        'imp': '\ud83d\udc7f',
        'inbox_tray': '\ud83d\udce5',
        'incoming_envelope': '\ud83d\udce8',
        'tipping_hand_woman': '\ud83d\udc81',
        'information_source': '\u2139\ufe0f',
        'innocent': '\ud83d\ude07',
        'interrobang': '\u2049\ufe0f',
        'iphone': '\ud83d\udcf1',
        'izakaya_lantern': '\ud83c\udfee',
        'jack_o_lantern': '\ud83c\udf83',
        'japan': '\ud83d\uddfe',
        'japanese_castle': '\ud83c\udfef',
        'japanese_goblin': '\ud83d\udc7a',
        'japanese_ogre': '\ud83d\udc79',
        'jeans': '\ud83d\udc56',
        'joy': '\ud83d\ude02',
        'joy_cat': '\ud83d\ude39',
        'joystick': '\ud83d\udd79',
        'kaaba': '\ud83d\udd4b',
        'key': '\ud83d\udd11',
        'keyboard': '\u2328\ufe0f',
        'keycap_ten': '\ud83d\udd1f',
        'kick_scooter': '\ud83d\udef4',
        'kimono': '\ud83d\udc58',
        'kiss': '\ud83d\udc8b',
        'kissing': '\ud83d\ude17',
        'kissing_cat': '\ud83d\ude3d',
        'kissing_closed_eyes': '\ud83d\ude1a',
        'kissing_heart': '\ud83d\ude18',
        'kissing_smiling_eyes': '\ud83d\ude19',
        'kiwi_fruit': '\ud83e\udd5d',
        'koala': '\ud83d\udc28',
        'koko': '\ud83c\ude01',
        'label': '\ud83c\udff7',
        'large_blue_circle': '\ud83d\udd35',
        'large_blue_diamond': '\ud83d\udd37',
        'large_orange_diamond': '\ud83d\udd36',
        'last_quarter_moon': '\ud83c\udf17',
        'last_quarter_moon_with_face': '\ud83c\udf1c',
        'latin_cross': '\u271d\ufe0f',
        'laughing': '\ud83d\ude06',
        'leaves': '\ud83c\udf43',
        'ledger': '\ud83d\udcd2',
        'left_luggage': '\ud83d\udec5',
        'left_right_arrow': '\u2194\ufe0f',
        'leftwards_arrow_with_hook': '\u21a9\ufe0f',
        'lemon': '\ud83c\udf4b',
        'leo': '\u264c\ufe0f',
        'leopard': '\ud83d\udc06',
        'level_slider': '\ud83c\udf9a',
        'libra': '\u264e\ufe0f',
        'light_rail': '\ud83d\ude88',
        'link': '\ud83d\udd17',
        'lion': '\ud83e\udd81',
        'lips': '\ud83d\udc44',
        'lipstick': '\ud83d\udc84',
        'lizard': '\ud83e\udd8e',
        'lock': '\ud83d\udd12',
        'lock_with_ink_pen': '\ud83d\udd0f',
        'lollipop': '\ud83c\udf6d',
        'loop': '\u27bf',
        'loud_sound': '\ud83d\udd0a',
        'loudspeaker': '\ud83d\udce2',
        'love_hotel': '\ud83c\udfe9',
        'love_letter': '\ud83d\udc8c',
        'low_brightness': '\ud83d\udd05',
        'lying_face': '\ud83e\udd25',
        'm': '\u24c2\ufe0f',
        'mag': '\ud83d\udd0d',
        'mag_right': '\ud83d\udd0e',
        'mahjong': '\ud83c\udc04\ufe0f',
        'mailbox': '\ud83d\udceb',
        'mailbox_closed': '\ud83d\udcea',
        'mailbox_with_mail': '\ud83d\udcec',
        'mailbox_with_no_mail': '\ud83d\udced',
        'man': '\ud83d\udc68',
        'man_artist': '\ud83d\udc68&zwj;\ud83c\udfa8',
        'man_astronaut': '\ud83d\udc68&zwj;\ud83d\ude80',
        'man_cartwheeling': '\ud83e\udd38&zwj;\u2642\ufe0f',
        'man_cook': '\ud83d\udc68&zwj;\ud83c\udf73',
        'man_dancing': '\ud83d\udd7a',
        'man_facepalming': '\ud83e\udd26&zwj;\u2642\ufe0f',
        'man_factory_worker': '\ud83d\udc68&zwj;\ud83c\udfed',
        'man_farmer': '\ud83d\udc68&zwj;\ud83c\udf3e',
        'man_firefighter': '\ud83d\udc68&zwj;\ud83d\ude92',
        'man_health_worker': '\ud83d\udc68&zwj;\u2695\ufe0f',
        'man_in_tuxedo': '\ud83e\udd35',
        'man_judge': '\ud83d\udc68&zwj;\u2696\ufe0f',
        'man_juggling': '\ud83e\udd39&zwj;\u2642\ufe0f',
        'man_mechanic': '\ud83d\udc68&zwj;\ud83d\udd27',
        'man_office_worker': '\ud83d\udc68&zwj;\ud83d\udcbc',
        'man_pilot': '\ud83d\udc68&zwj;\u2708\ufe0f',
        'man_playing_handball': '\ud83e\udd3e&zwj;\u2642\ufe0f',
        'man_playing_water_polo': '\ud83e\udd3d&zwj;\u2642\ufe0f',
        'man_scientist': '\ud83d\udc68&zwj;\ud83d\udd2c',
        'man_shrugging': '\ud83e\udd37&zwj;\u2642\ufe0f',
        'man_singer': '\ud83d\udc68&zwj;\ud83c\udfa4',
        'man_student': '\ud83d\udc68&zwj;\ud83c\udf93',
        'man_teacher': '\ud83d\udc68&zwj;\ud83c\udfeb',
        'man_technologist': '\ud83d\udc68&zwj;\ud83d\udcbb',
        'man_with_gua_pi_mao': '\ud83d\udc72',
        'man_with_turban': '\ud83d\udc73',
        'tangerine': '\ud83c\udf4a',
        'mans_shoe': '\ud83d\udc5e',
        'mantelpiece_clock': '\ud83d\udd70',
        'maple_leaf': '\ud83c\udf41',
        'martial_arts_uniform': '\ud83e\udd4b',
        'mask': '\ud83d\ude37',
        'massage_woman': '\ud83d\udc86',
        'massage_man': '\ud83d\udc86&zwj;\u2642\ufe0f',
        'meat_on_bone': '\ud83c\udf56',
        'medal_military': '\ud83c\udf96',
        'medal_sports': '\ud83c\udfc5',
        'mega': '\ud83d\udce3',
        'melon': '\ud83c\udf48',
        'memo': '\ud83d\udcdd',
        'men_wrestling': '\ud83e\udd3c&zwj;\u2642\ufe0f',
        'menorah': '\ud83d\udd4e',
        'mens': '\ud83d\udeb9',
        'metal': '\ud83e\udd18',
        'metro': '\ud83d\ude87',
        'microphone': '\ud83c\udfa4',
        'microscope': '\ud83d\udd2c',
        'milk_glass': '\ud83e\udd5b',
        'milky_way': '\ud83c\udf0c',
        'minibus': '\ud83d\ude90',
        'minidisc': '\ud83d\udcbd',
        'mobile_phone_off': '\ud83d\udcf4',
        'money_mouth_face': '\ud83e\udd11',
        'money_with_wings': '\ud83d\udcb8',
        'moneybag': '\ud83d\udcb0',
        'monkey': '\ud83d\udc12',
        'monkey_face': '\ud83d\udc35',
        'monorail': '\ud83d\ude9d',
        'moon': '\ud83c\udf14',
        'mortar_board': '\ud83c\udf93',
        'mosque': '\ud83d\udd4c',
        'motor_boat': '\ud83d\udee5',
        'motor_scooter': '\ud83d\udef5',
        'motorcycle': '\ud83c\udfcd',
        'motorway': '\ud83d\udee3',
        'mount_fuji': '\ud83d\uddfb',
        'mountain': '\u26f0',
        'mountain_biking_man': '\ud83d\udeb5',
        'mountain_biking_woman': '\ud83d\udeb5&zwj;\u2640\ufe0f',
        'mountain_cableway': '\ud83d\udea0',
        'mountain_railway': '\ud83d\ude9e',
        'mountain_snow': '\ud83c\udfd4',
        'mouse': '\ud83d\udc2d',
        'mouse2': '\ud83d\udc01',
        'movie_camera': '\ud83c\udfa5',
        'moyai': '\ud83d\uddff',
        'mrs_claus': '\ud83e\udd36',
        'muscle': '\ud83d\udcaa',
        'mushroom': '\ud83c\udf44',
        'musical_keyboard': '\ud83c\udfb9',
        'musical_note': '\ud83c\udfb5',
        'musical_score': '\ud83c\udfbc',
        'mute': '\ud83d\udd07',
        'nail_care': '\ud83d\udc85',
        'name_badge': '\ud83d\udcdb',
        'national_park': '\ud83c\udfde',
        'nauseated_face': '\ud83e\udd22',
        'necktie': '\ud83d\udc54',
        'negative_squared_cross_mark': '\u274e',
        'nerd_face': '\ud83e\udd13',
        'neutral_face': '\ud83d\ude10',
        'new': '\ud83c\udd95',
        'new_moon': '\ud83c\udf11',
        'new_moon_with_face': '\ud83c\udf1a',
        'newspaper': '\ud83d\udcf0',
        'newspaper_roll': '\ud83d\uddde',
        'next_track_button': '\u23ed',
        'ng': '\ud83c\udd96',
        'no_good_man': '\ud83d\ude45&zwj;\u2642\ufe0f',
        'no_good_woman': '\ud83d\ude45',
        'night_with_stars': '\ud83c\udf03',
        'no_bell': '\ud83d\udd15',
        'no_bicycles': '\ud83d\udeb3',
        'no_entry': '\u26d4\ufe0f',
        'no_entry_sign': '\ud83d\udeab',
        'no_mobile_phones': '\ud83d\udcf5',
        'no_mouth': '\ud83d\ude36',
        'no_pedestrians': '\ud83d\udeb7',
        'no_smoking': '\ud83d\udead',
        'non-potable_water': '\ud83d\udeb1',
        'nose': '\ud83d\udc43',
        'notebook': '\ud83d\udcd3',
        'notebook_with_decorative_cover': '\ud83d\udcd4',
        'notes': '\ud83c\udfb6',
        'nut_and_bolt': '\ud83d\udd29',
        'o': '\u2b55\ufe0f',
        'o2': '\ud83c\udd7e\ufe0f',
        'ocean': '\ud83c\udf0a',
        'octopus': '\ud83d\udc19',
        'oden': '\ud83c\udf62',
        'office': '\ud83c\udfe2',
        'oil_drum': '\ud83d\udee2',
        'ok': '\ud83c\udd97',
        'ok_hand': '\ud83d\udc4c',
        'ok_man': '\ud83d\ude46&zwj;\u2642\ufe0f',
        'ok_woman': '\ud83d\ude46',
        'old_key': '\ud83d\udddd',
        'older_man': '\ud83d\udc74',
        'older_woman': '\ud83d\udc75',
        'om': '\ud83d\udd49',
        'on': '\ud83d\udd1b',
        'oncoming_automobile': '\ud83d\ude98',
        'oncoming_bus': '\ud83d\ude8d',
        'oncoming_police_car': '\ud83d\ude94',
        'oncoming_taxi': '\ud83d\ude96',
        'open_file_folder': '\ud83d\udcc2',
        'open_hands': '\ud83d\udc50',
        'open_mouth': '\ud83d\ude2e',
        'open_umbrella': '\u2602\ufe0f',
        'ophiuchus': '\u26ce',
        'orange_book': '\ud83d\udcd9',
        'orthodox_cross': '\u2626\ufe0f',
        'outbox_tray': '\ud83d\udce4',
        'owl': '\ud83e\udd89',
        'ox': '\ud83d\udc02',
        'package': '\ud83d\udce6',
        'page_facing_up': '\ud83d\udcc4',
        'page_with_curl': '\ud83d\udcc3',
        'pager': '\ud83d\udcdf',
        'paintbrush': '\ud83d\udd8c',
        'palm_tree': '\ud83c\udf34',
        'pancakes': '\ud83e\udd5e',
        'panda_face': '\ud83d\udc3c',
        'paperclip': '\ud83d\udcce',
        'paperclips': '\ud83d\udd87',
        'parasol_on_ground': '\u26f1',
        'parking': '\ud83c\udd7f\ufe0f',
        'part_alternation_mark': '\u303d\ufe0f',
        'partly_sunny': '\u26c5\ufe0f',
        'passenger_ship': '\ud83d\udef3',
        'passport_control': '\ud83d\udec2',
        'pause_button': '\u23f8',
        'peace_symbol': '\u262e\ufe0f',
        'peach': '\ud83c\udf51',
        'peanuts': '\ud83e\udd5c',
        'pear': '\ud83c\udf50',
        'pen': '\ud83d\udd8a',
        'pencil2': '\u270f\ufe0f',
        'penguin': '\ud83d\udc27',
        'pensive': '\ud83d\ude14',
        'performing_arts': '\ud83c\udfad',
        'persevere': '\ud83d\ude23',
        'person_fencing': '\ud83e\udd3a',
        'pouting_woman': '\ud83d\ude4e',
        'phone': '\u260e\ufe0f',
        'pick': '\u26cf',
        'pig': '\ud83d\udc37',
        'pig2': '\ud83d\udc16',
        'pig_nose': '\ud83d\udc3d',
        'pill': '\ud83d\udc8a',
        'pineapple': '\ud83c\udf4d',
        'ping_pong': '\ud83c\udfd3',
        'pisces': '\u2653\ufe0f',
        'pizza': '\ud83c\udf55',
        'place_of_worship': '\ud83d\uded0',
        'plate_with_cutlery': '\ud83c\udf7d',
        'play_or_pause_button': '\u23ef',
        'point_down': '\ud83d\udc47',
        'point_left': '\ud83d\udc48',
        'point_right': '\ud83d\udc49',
        'point_up': '\u261d\ufe0f',
        'point_up_2': '\ud83d\udc46',
        'police_car': '\ud83d\ude93',
        'policewoman': '\ud83d\udc6e&zwj;\u2640\ufe0f',
        'poodle': '\ud83d\udc29',
        'popcorn': '\ud83c\udf7f',
        'post_office': '\ud83c\udfe3',
        'postal_horn': '\ud83d\udcef',
        'postbox': '\ud83d\udcee',
        'potable_water': '\ud83d\udeb0',
        'potato': '\ud83e\udd54',
        'pouch': '\ud83d\udc5d',
        'poultry_leg': '\ud83c\udf57',
        'pound': '\ud83d\udcb7',
        'rage': '\ud83d\ude21',
        'pouting_cat': '\ud83d\ude3e',
        'pouting_man': '\ud83d\ude4e&zwj;\u2642\ufe0f',
        'pray': '\ud83d\ude4f',
        'prayer_beads': '\ud83d\udcff',
        'pregnant_woman': '\ud83e\udd30',
        'previous_track_button': '\u23ee',
        'prince': '\ud83e\udd34',
        'princess': '\ud83d\udc78',
        'printer': '\ud83d\udda8',
        'purple_heart': '\ud83d\udc9c',
        'purse': '\ud83d\udc5b',
        'pushpin': '\ud83d\udccc',
        'put_litter_in_its_place': '\ud83d\udeae',
        'question': '\u2753',
        'rabbit': '\ud83d\udc30',
        'rabbit2': '\ud83d\udc07',
        'racehorse': '\ud83d\udc0e',
        'racing_car': '\ud83c\udfce',
        'radio': '\ud83d\udcfb',
        'radio_button': '\ud83d\udd18',
        'radioactive': '\u2622\ufe0f',
        'railway_car': '\ud83d\ude83',
        'railway_track': '\ud83d\udee4',
        'rainbow': '\ud83c\udf08',
        'rainbow_flag': '\ud83c\udff3\ufe0f&zwj;\ud83c\udf08',
        'raised_back_of_hand': '\ud83e\udd1a',
        'raised_hand_with_fingers_splayed': '\ud83d\udd90',
        'raised_hands': '\ud83d\ude4c',
        'raising_hand_woman': '\ud83d\ude4b',
        'raising_hand_man': '\ud83d\ude4b&zwj;\u2642\ufe0f',
        'ram': '\ud83d\udc0f',
        'ramen': '\ud83c\udf5c',
        'rat': '\ud83d\udc00',
        'record_button': '\u23fa',
        'recycle': '\u267b\ufe0f',
        'red_circle': '\ud83d\udd34',
        'registered': '\u00ae\ufe0f',
        'relaxed': '\u263a\ufe0f',
        'relieved': '\ud83d\ude0c',
        'reminder_ribbon': '\ud83c\udf97',
        'repeat': '\ud83d\udd01',
        'repeat_one': '\ud83d\udd02',
        'rescue_worker_helmet': '\u26d1',
        'restroom': '\ud83d\udebb',
        'revolving_hearts': '\ud83d\udc9e',
        'rewind': '\u23ea',
        'rhinoceros': '\ud83e\udd8f',
        'ribbon': '\ud83c\udf80',
        'rice': '\ud83c\udf5a',
        'rice_ball': '\ud83c\udf59',
        'rice_cracker': '\ud83c\udf58',
        'rice_scene': '\ud83c\udf91',
        'right_anger_bubble': '\ud83d\uddef',
        'ring': '\ud83d\udc8d',
        'robot': '\ud83e\udd16',
        'rocket': '\ud83d\ude80',
        'rofl': '\ud83e\udd23',
        'roll_eyes': '\ud83d\ude44',
        'roller_coaster': '\ud83c\udfa2',
        'rooster': '\ud83d\udc13',
        'rose': '\ud83c\udf39',
        'rosette': '\ud83c\udff5',
        'rotating_light': '\ud83d\udea8',
        'round_pushpin': '\ud83d\udccd',
        'rowing_man': '\ud83d\udea3',
        'rowing_woman': '\ud83d\udea3&zwj;\u2640\ufe0f',
        'rugby_football': '\ud83c\udfc9',
        'running_man': '\ud83c\udfc3',
        'running_shirt_with_sash': '\ud83c\udfbd',
        'running_woman': '\ud83c\udfc3&zwj;\u2640\ufe0f',
        'sa': '\ud83c\ude02\ufe0f',
        'sagittarius': '\u2650\ufe0f',
        'sake': '\ud83c\udf76',
        'sandal': '\ud83d\udc61',
        'santa': '\ud83c\udf85',
        'satellite': '\ud83d\udce1',
        'saxophone': '\ud83c\udfb7',
        'school': '\ud83c\udfeb',
        'school_satchel': '\ud83c\udf92',
        'scissors': '\u2702\ufe0f',
        'scorpion': '\ud83e\udd82',
        'scorpius': '\u264f\ufe0f',
        'scream': '\ud83d\ude31',
        'scream_cat': '\ud83d\ude40',
        'scroll': '\ud83d\udcdc',
        'seat': '\ud83d\udcba',
        'secret': '\u3299\ufe0f',
        'see_no_evil': '\ud83d\ude48',
        'seedling': '\ud83c\udf31',
        'selfie': '\ud83e\udd33',
        'shallow_pan_of_food': '\ud83e\udd58',
        'shamrock': '\u2618\ufe0f',
        'shark': '\ud83e\udd88',
        'shaved_ice': '\ud83c\udf67',
        'sheep': '\ud83d\udc11',
        'shell': '\ud83d\udc1a',
        'shield': '\ud83d\udee1',
        'shinto_shrine': '\u26e9',
        'ship': '\ud83d\udea2',
        'shirt': '\ud83d\udc55',
        'shopping': '\ud83d\udecd',
        'shopping_cart': '\ud83d\uded2',
        'shower': '\ud83d\udebf',
        'shrimp': '\ud83e\udd90',
        'signal_strength': '\ud83d\udcf6',
        'six_pointed_star': '\ud83d\udd2f',
        'ski': '\ud83c\udfbf',
        'skier': '\u26f7',
        'skull': '\ud83d\udc80',
        'skull_and_crossbones': '\u2620\ufe0f',
        'sleeping': '\ud83d\ude34',
        'sleeping_bed': '\ud83d\udecc',
        'sleepy': '\ud83d\ude2a',
        'slightly_frowning_face': '\ud83d\ude41',
        'slightly_smiling_face': '\ud83d\ude42',
        'slot_machine': '\ud83c\udfb0',
        'small_airplane': '\ud83d\udee9',
        'small_blue_diamond': '\ud83d\udd39',
        'small_orange_diamond': '\ud83d\udd38',
        'small_red_triangle': '\ud83d\udd3a',
        'small_red_triangle_down': '\ud83d\udd3b',
        'smile': '\ud83d\ude04',
        'smile_cat': '\ud83d\ude38',
        'smiley': '\ud83d\ude03',
        'smiley_cat': '\ud83d\ude3a',
        'smiling_imp': '\ud83d\ude08',
        'smirk': '\ud83d\ude0f',
        'smirk_cat': '\ud83d\ude3c',
        'smoking': '\ud83d\udeac',
        'snail': '\ud83d\udc0c',
        'snake': '\ud83d\udc0d',
        'sneezing_face': '\ud83e\udd27',
        'snowboarder': '\ud83c\udfc2',
        'snowflake': '\u2744\ufe0f',
        'snowman': '\u26c4\ufe0f',
        'snowman_with_snow': '\u2603\ufe0f',
        'sob': '\ud83d\ude2d',
        'soccer': '\u26bd\ufe0f',
        'soon': '\ud83d\udd1c',
        'sos': '\ud83c\udd98',
        'sound': '\ud83d\udd09',
        'space_invader': '\ud83d\udc7e',
        'spades': '\u2660\ufe0f',
        'spaghetti': '\ud83c\udf5d',
        'sparkle': '\u2747\ufe0f',
        'sparkler': '\ud83c\udf87',
        'sparkles': '\u2728',
        'sparkling_heart': '\ud83d\udc96',
        'speak_no_evil': '\ud83d\ude4a',
        'speaker': '\ud83d\udd08',
        'speaking_head': '\ud83d\udde3',
        'speech_balloon': '\ud83d\udcac',
        'speedboat': '\ud83d\udea4',
        'spider': '\ud83d\udd77',
        'spider_web': '\ud83d\udd78',
        'spiral_calendar': '\ud83d\uddd3',
        'spiral_notepad': '\ud83d\uddd2',
        'spoon': '\ud83e\udd44',
        'squid': '\ud83e\udd91',
        'stadium': '\ud83c\udfdf',
        'star': '\u2b50\ufe0f',
        'star2': '\ud83c\udf1f',
        'star_and_crescent': '\u262a\ufe0f',
        'star_of_david': '\u2721\ufe0f',
        'stars': '\ud83c\udf20',
        'station': '\ud83d\ude89',
        'statue_of_liberty': '\ud83d\uddfd',
        'steam_locomotive': '\ud83d\ude82',
        'stew': '\ud83c\udf72',
        'stop_button': '\u23f9',
        'stop_sign': '\ud83d\uded1',
        'stopwatch': '\u23f1',
        'straight_ruler': '\ud83d\udccf',
        'strawberry': '\ud83c\udf53',
        'stuck_out_tongue': '\ud83d\ude1b',
        'stuck_out_tongue_closed_eyes': '\ud83d\ude1d',
        'stuck_out_tongue_winking_eye': '\ud83d\ude1c',
        'studio_microphone': '\ud83c\udf99',
        'stuffed_flatbread': '\ud83e\udd59',
        'sun_behind_large_cloud': '\ud83c\udf25',
        'sun_behind_rain_cloud': '\ud83c\udf26',
        'sun_behind_small_cloud': '\ud83c\udf24',
        'sun_with_face': '\ud83c\udf1e',
        'sunflower': '\ud83c\udf3b',
        'sunglasses': '\ud83d\ude0e',
        'sunny': '\u2600\ufe0f',
        'sunrise': '\ud83c\udf05',
        'sunrise_over_mountains': '\ud83c\udf04',
        'surfing_man': '\ud83c\udfc4',
        'surfing_woman': '\ud83c\udfc4&zwj;\u2640\ufe0f',
        'sushi': '\ud83c\udf63',
        'suspension_railway': '\ud83d\ude9f',
        'sweat': '\ud83d\ude13',
        'sweat_drops': '\ud83d\udca6',
        'sweat_smile': '\ud83d\ude05',
        'sweet_potato': '\ud83c\udf60',
        'swimming_man': '\ud83c\udfca',
        'swimming_woman': '\ud83c\udfca&zwj;\u2640\ufe0f',
        'symbols': '\ud83d\udd23',
        'synagogue': '\ud83d\udd4d',
        'syringe': '\ud83d\udc89',
        'taco': '\ud83c\udf2e',
        'tada': '\ud83c\udf89',
        'tanabata_tree': '\ud83c\udf8b',
        'taurus': '\u2649\ufe0f',
        'taxi': '\ud83d\ude95',
        'tea': '\ud83c\udf75',
        'telephone_receiver': '\ud83d\udcde',
        'telescope': '\ud83d\udd2d',
        'tennis': '\ud83c\udfbe',
        'tent': '\u26fa\ufe0f',
        'thermometer': '\ud83c\udf21',
        'thinking': '\ud83e\udd14',
        'thought_balloon': '\ud83d\udcad',
        'ticket': '\ud83c\udfab',
        'tickets': '\ud83c\udf9f',
        'tiger': '\ud83d\udc2f',
        'tiger2': '\ud83d\udc05',
        'timer_clock': '\u23f2',
        'tipping_hand_man': '\ud83d\udc81&zwj;\u2642\ufe0f',
        'tired_face': '\ud83d\ude2b',
        'tm': '\u2122\ufe0f',
        'toilet': '\ud83d\udebd',
        'tokyo_tower': '\ud83d\uddfc',
        'tomato': '\ud83c\udf45',
        'tongue': '\ud83d\udc45',
        'top': '\ud83d\udd1d',
        'tophat': '\ud83c\udfa9',
        'tornado': '\ud83c\udf2a',
        'trackball': '\ud83d\uddb2',
        'tractor': '\ud83d\ude9c',
        'traffic_light': '\ud83d\udea5',
        'train': '\ud83d\ude8b',
        'train2': '\ud83d\ude86',
        'tram': '\ud83d\ude8a',
        'triangular_flag_on_post': '\ud83d\udea9',
        'triangular_ruler': '\ud83d\udcd0',
        'trident': '\ud83d\udd31',
        'triumph': '\ud83d\ude24',
        'trolleybus': '\ud83d\ude8e',
        'trophy': '\ud83c\udfc6',
        'tropical_drink': '\ud83c\udf79',
        'tropical_fish': '\ud83d\udc20',
        'truck': '\ud83d\ude9a',
        'trumpet': '\ud83c\udfba',
        'tulip': '\ud83c\udf37',
        'tumbler_glass': '\ud83e\udd43',
        'turkey': '\ud83e\udd83',
        'turtle': '\ud83d\udc22',
        'tv': '\ud83d\udcfa',
        'twisted_rightwards_arrows': '\ud83d\udd00',
        'two_hearts': '\ud83d\udc95',
        'two_men_holding_hands': '\ud83d\udc6c',
        'two_women_holding_hands': '\ud83d\udc6d',
        'u5272': '\ud83c\ude39',
        'u5408': '\ud83c\ude34',
        'u55b6': '\ud83c\ude3a',
        'u6307': '\ud83c\ude2f\ufe0f',
        'u6708': '\ud83c\ude37\ufe0f',
        'u6709': '\ud83c\ude36',
        'u6e80': '\ud83c\ude35',
        'u7121': '\ud83c\ude1a\ufe0f',
        'u7533': '\ud83c\ude38',
        'u7981': '\ud83c\ude32',
        'u7a7a': '\ud83c\ude33',
        'umbrella': '\u2614\ufe0f',
        'unamused': '\ud83d\ude12',
        'underage': '\ud83d\udd1e',
        'unicorn': '\ud83e\udd84',
        'unlock': '\ud83d\udd13',
        'up': '\ud83c\udd99',
        'upside_down_face': '\ud83d\ude43',
        'v': '\u270c\ufe0f',
        'vertical_traffic_light': '\ud83d\udea6',
        'vhs': '\ud83d\udcfc',
        'vibration_mode': '\ud83d\udcf3',
        'video_camera': '\ud83d\udcf9',
        'video_game': '\ud83c\udfae',
        'violin': '\ud83c\udfbb',
        'virgo': '\u264d\ufe0f',
        'volcano': '\ud83c\udf0b',
        'volleyball': '\ud83c\udfd0',
        'vs': '\ud83c\udd9a',
        'vulcan_salute': '\ud83d\udd96',
        'walking_man': '\ud83d\udeb6',
        'walking_woman': '\ud83d\udeb6&zwj;\u2640\ufe0f',
        'waning_crescent_moon': '\ud83c\udf18',
        'waning_gibbous_moon': '\ud83c\udf16',
        'warning': '\u26a0\ufe0f',
        'wastebasket': '\ud83d\uddd1',
        'watch': '\u231a\ufe0f',
        'water_buffalo': '\ud83d\udc03',
        'watermelon': '\ud83c\udf49',
        'wave': '\ud83d\udc4b',
        'wavy_dash': '\u3030\ufe0f',
        'waxing_crescent_moon': '\ud83c\udf12',
        'wc': '\ud83d\udebe',
        'weary': '\ud83d\ude29',
        'wedding': '\ud83d\udc92',
        'weight_lifting_man': '\ud83c\udfcb\ufe0f',
        'weight_lifting_woman': '\ud83c\udfcb\ufe0f&zwj;\u2640\ufe0f',
        'whale': '\ud83d\udc33',
        'whale2': '\ud83d\udc0b',
        'wheel_of_dharma': '\u2638\ufe0f',
        'wheelchair': '\u267f\ufe0f',
        'white_check_mark': '\u2705',
        'white_circle': '\u26aa\ufe0f',
        'white_flag': '\ud83c\udff3\ufe0f',
        'white_flower': '\ud83d\udcae',
        'white_large_square': '\u2b1c\ufe0f',
        'white_medium_small_square': '\u25fd\ufe0f',
        'white_medium_square': '\u25fb\ufe0f',
        'white_small_square': '\u25ab\ufe0f',
        'white_square_button': '\ud83d\udd33',
        'wilted_flower': '\ud83e\udd40',
        'wind_chime': '\ud83c\udf90',
        'wind_face': '\ud83c\udf2c',
        'wine_glass': '\ud83c\udf77',
        'wink': '\ud83d\ude09',
        'wolf': '\ud83d\udc3a',
        'woman': '\ud83d\udc69',
        'woman_artist': '\ud83d\udc69&zwj;\ud83c\udfa8',
        'woman_astronaut': '\ud83d\udc69&zwj;\ud83d\ude80',
        'woman_cartwheeling': '\ud83e\udd38&zwj;\u2640\ufe0f',
        'woman_cook': '\ud83d\udc69&zwj;\ud83c\udf73',
        'woman_facepalming': '\ud83e\udd26&zwj;\u2640\ufe0f',
        'woman_factory_worker': '\ud83d\udc69&zwj;\ud83c\udfed',
        'woman_farmer': '\ud83d\udc69&zwj;\ud83c\udf3e',
        'woman_firefighter': '\ud83d\udc69&zwj;\ud83d\ude92',
        'woman_health_worker': '\ud83d\udc69&zwj;\u2695\ufe0f',
        'woman_judge': '\ud83d\udc69&zwj;\u2696\ufe0f',
        'woman_juggling': '\ud83e\udd39&zwj;\u2640\ufe0f',
        'woman_mechanic': '\ud83d\udc69&zwj;\ud83d\udd27',
        'woman_office_worker': '\ud83d\udc69&zwj;\ud83d\udcbc',
        'woman_pilot': '\ud83d\udc69&zwj;\u2708\ufe0f',
        'woman_playing_handball': '\ud83e\udd3e&zwj;\u2640\ufe0f',
        'woman_playing_water_polo': '\ud83e\udd3d&zwj;\u2640\ufe0f',
        'woman_scientist': '\ud83d\udc69&zwj;\ud83d\udd2c',
        'woman_shrugging': '\ud83e\udd37&zwj;\u2640\ufe0f',
        'woman_singer': '\ud83d\udc69&zwj;\ud83c\udfa4',
        'woman_student': '\ud83d\udc69&zwj;\ud83c\udf93',
        'woman_teacher': '\ud83d\udc69&zwj;\ud83c\udfeb',
        'woman_technologist': '\ud83d\udc69&zwj;\ud83d\udcbb',
        'woman_with_turban': '\ud83d\udc73&zwj;\u2640\ufe0f',
        'womans_clothes': '\ud83d\udc5a',
        'womans_hat': '\ud83d\udc52',
        'women_wrestling': '\ud83e\udd3c&zwj;\u2640\ufe0f',
        'womens': '\ud83d\udeba',
        'world_map': '\ud83d\uddfa',
        'worried': '\ud83d\ude1f',
        'wrench': '\ud83d\udd27',
        'writing_hand': '\u270d\ufe0f',
        'x': '\u274c',
        'yellow_heart': '\ud83d\udc9b',
        'yen': '\ud83d\udcb4',
        'yin_yang': '\u262f\ufe0f',
        'yum': '\ud83d\ude0b',
        'zap': '\u26a1\ufe0f',
        'zipper_mouth_face': '\ud83e\udd10',
        'zzz': '\ud83d\udca4',
        /* special emojis :P */
        'octocat': '<img alt=":octocat:" height="20" width="20" align="absmiddle" src="https://assets-cdn.github.com/images/icons/emoji/octocat.png">',
        'showdown': '<span style="font-family: \'Anonymous Pro\', monospace; text-decoration: underline; text-decoration-style: dashed; text-decoration-color: #3e8b8a;text-underline-position: under;">S</span>'
      };

      /**
       * Created by Estevao on 31-05-2015.
       */

      /**
       * Showdown Converter class
       * @class
       * @param {object} [converterOptions]
       * @returns {Converter}
       */
      showdown.Converter = function (converterOptions) {

        var
          /**
           * Options used by this converter
           * @private
           * @type {{}}
           */
          options = {},
          /**
           * Language extensions used by this converter
           * @private
           * @type {Array}
           */
          langExtensions = [],
          /**
           * Output modifiers extensions used by this converter
           * @private
           * @type {Array}
           */
          outputModifiers = [],
          /**
           * Event listeners
           * @private
           * @type {{}}
           */
          listeners = {},
          /**
           * The flavor set in this converter
           */
          setConvFlavor = setFlavor,
          /**
           * Metadata of the document
           * @type {{parsed: {}, raw: string, format: string}}
           */
          metadata = {
            parsed: {},
            raw: '',
            format: ''
          };
        _constructor();

        /**
         * Converter constructor
         * @private
         */
        function _constructor() {
          converterOptions = converterOptions || {};
          for (var gOpt in globalOptions) {
            if (globalOptions.hasOwnProperty(gOpt)) {
              options[gOpt] = globalOptions[gOpt];
            }
          }

          // Merge options
          if (typeof converterOptions === 'object') {
            for (var opt in converterOptions) {
              if (converterOptions.hasOwnProperty(opt)) {
                options[opt] = converterOptions[opt];
              }
            }
          } else {
            throw Error('Converter expects the passed parameter to be an object, but ' + typeof converterOptions + ' was passed instead.');
          }
          if (options.extensions) {
            showdown.helper.forEach(options.extensions, _parseExtension);
          }
        }

        /**
         * Parse extension
         * @param {*} ext
         * @param {string} [name='']
         * @private
         */
        function _parseExtension(ext, name) {
          name = name || null;
          // If it's a string, the extension was previously loaded
          if (showdown.helper.isString(ext)) {
            ext = showdown.helper.stdExtName(ext);
            name = ext;

            // LEGACY_SUPPORT CODE
            if (showdown.extensions[ext]) {
              console.warn('DEPRECATION WARNING: ' + ext + ' is an old extension that uses a deprecated loading method.' + 'Please inform the developer that the extension should be updated!');
              legacyExtensionLoading(showdown.extensions[ext], ext);
              return;
              // END LEGACY SUPPORT CODE
            } else if (!showdown.helper.isUndefined(extensions[ext])) {
              ext = extensions[ext];
            } else {
              throw Error('Extension "' + ext + '" could not be loaded. It was either not found or is not a valid extension.');
            }
          }
          if (typeof ext === 'function') {
            ext = ext();
          }
          if (!showdown.helper.isArray(ext)) {
            ext = [ext];
          }
          var validExt = validate(ext, name);
          if (!validExt.valid) {
            throw Error(validExt.error);
          }
          for (var i = 0; i < ext.length; ++i) {
            switch (ext[i].type) {
              case 'lang':
                langExtensions.push(ext[i]);
                break;
              case 'output':
                outputModifiers.push(ext[i]);
                break;
            }
            if (ext[i].hasOwnProperty('listeners')) {
              for (var ln in ext[i].listeners) {
                if (ext[i].listeners.hasOwnProperty(ln)) {
                  listen(ln, ext[i].listeners[ln]);
                }
              }
            }
          }
        }

        /**
         * LEGACY_SUPPORT
         * @param {*} ext
         * @param {string} name
         */
        function legacyExtensionLoading(ext, name) {
          if (typeof ext === 'function') {
            ext = ext(new showdown.Converter());
          }
          if (!showdown.helper.isArray(ext)) {
            ext = [ext];
          }
          var valid = validate(ext, name);
          if (!valid.valid) {
            throw Error(valid.error);
          }
          for (var i = 0; i < ext.length; ++i) {
            switch (ext[i].type) {
              case 'lang':
                langExtensions.push(ext[i]);
                break;
              case 'output':
                outputModifiers.push(ext[i]);
                break;
              default:
                // should never reach here
                throw Error('Extension loader error: Type unrecognized!!!');
            }
          }
        }

        /**
         * Listen to an event
         * @param {string} name
         * @param {function} callback
         */
        function listen(name, callback) {
          if (!showdown.helper.isString(name)) {
            throw Error('Invalid argument in converter.listen() method: name must be a string, but ' + typeof name + ' given');
          }
          if (typeof callback !== 'function') {
            throw Error('Invalid argument in converter.listen() method: callback must be a function, but ' + typeof callback + ' given');
          }
          if (!listeners.hasOwnProperty(name)) {
            listeners[name] = [];
          }
          listeners[name].push(callback);
        }
        function rTrimInputText(text) {
          var rsp = text.match(/^\s*/)[0].length,
            rgx = new RegExp('^\\s{0,' + rsp + '}', 'gm');
          return text.replace(rgx, '');
        }

        /**
         * Dispatch an event
         * @private
         * @param {string} evtName Event name
         * @param {string} text Text
         * @param {{}} options Converter Options
         * @param {{}} globals
         * @returns {string}
         */
        this._dispatch = function dispatch(evtName, text, options, globals) {
          if (listeners.hasOwnProperty(evtName)) {
            for (var ei = 0; ei < listeners[evtName].length; ++ei) {
              var nText = listeners[evtName][ei](evtName, text, this, options, globals);
              if (nText && typeof nText !== 'undefined') {
                text = nText;
              }
            }
          }
          return text;
        };

        /**
         * Listen to an event
         * @param {string} name
         * @param {function} callback
         * @returns {showdown.Converter}
         */
        this.listen = function (name, callback) {
          listen(name, callback);
          return this;
        };

        /**
         * Converts a markdown string into HTML
         * @param {string} text
         * @returns {*}
         */
        this.makeHtml = function (text) {
          //check if text is not falsy
          if (!text) {
            return text;
          }
          var globals = {
            gHtmlBlocks: [],
            gHtmlMdBlocks: [],
            gHtmlSpans: [],
            gUrls: {},
            gTitles: {},
            gDimensions: {},
            gListLevel: 0,
            hashLinkCounts: {},
            langExtensions: langExtensions,
            outputModifiers: outputModifiers,
            converter: this,
            ghCodeBlocks: [],
            metadata: {
              parsed: {},
              raw: '',
              format: ''
            }
          };

          // This lets us use ¨ trema as an escape char to avoid md5 hashes
          // The choice of character is arbitrary; anything that isn't
          // magic in Markdown will work.
          text = text.replace(/¨/g, '¨T');

          // Replace $ with ¨D
          // RegExp interprets $ as a special character
          // when it's in a replacement string
          text = text.replace(/\$/g, '¨D');

          // Standardize line endings
          text = text.replace(/\r\n/g, '\n'); // DOS to Unix
          text = text.replace(/\r/g, '\n'); // Mac to Unix

          // Stardardize line spaces
          text = text.replace(/\u00A0/g, '&nbsp;');
          if (options.smartIndentationFix) {
            text = rTrimInputText(text);
          }

          // Make sure text begins and ends with a couple of newlines:
          text = '\n\n' + text + '\n\n';

          // detab
          text = showdown.subParser('detab')(text, options, globals);

          /**
           * Strip any lines consisting only of spaces and tabs.
           * This makes subsequent regexs easier to write, because we can
           * match consecutive blank lines with /\n+/ instead of something
           * contorted like /[ \t]*\n+/
           */
          text = text.replace(/^[ \t]+$/mg, '');

          //run languageExtensions
          showdown.helper.forEach(langExtensions, function (ext) {
            text = showdown.subParser('runExtension')(ext, text, options, globals);
          });

          // run the sub parsers
          text = showdown.subParser('metadata')(text, options, globals);
          text = showdown.subParser('hashPreCodeTags')(text, options, globals);
          text = showdown.subParser('githubCodeBlocks')(text, options, globals);
          text = showdown.subParser('hashHTMLBlocks')(text, options, globals);
          text = showdown.subParser('hashCodeTags')(text, options, globals);
          text = showdown.subParser('stripLinkDefinitions')(text, options, globals);
          text = showdown.subParser('blockGamut')(text, options, globals);
          text = showdown.subParser('unhashHTMLSpans')(text, options, globals);
          text = showdown.subParser('unescapeSpecialChars')(text, options, globals);

          // attacklab: Restore dollar signs
          text = text.replace(/¨D/g, '$$');

          // attacklab: Restore tremas
          text = text.replace(/¨T/g, '¨');

          // render a complete html document instead of a partial if the option is enabled
          text = showdown.subParser('completeHTMLDocument')(text, options, globals);

          // Run output modifiers
          showdown.helper.forEach(outputModifiers, function (ext) {
            text = showdown.subParser('runExtension')(ext, text, options, globals);
          });

          // update metadata
          metadata = globals.metadata;
          return text;
        };

        /**
         * Converts an HTML string into a markdown string
         * @param src
         * @param [HTMLParser] A WHATWG DOM and HTML parser, such as JSDOM. If none is supplied, window.document will be used.
         * @returns {string}
         */
        this.makeMarkdown = this.makeMd = function (src, HTMLParser) {
          // replace \r\n with \n
          src = src.replace(/\r\n/g, '\n');
          src = src.replace(/\r/g, '\n'); // old macs

          // due to an edge case, we need to find this: > <
          // to prevent removing of non silent white spaces
          // ex: <em>this is</em> <strong>sparta</strong>
          src = src.replace(/>[ \t]+</, '>¨NBSP;<');
          if (!HTMLParser) {
            if (window && window.document) {
              HTMLParser = window.document;
            } else {
              throw new Error('HTMLParser is undefined. If in a webworker or nodejs environment, you need to provide a WHATWG DOM and HTML such as JSDOM');
            }
          }
          var doc = HTMLParser.createElement('div');
          doc.innerHTML = src;
          var globals = {
            preList: substitutePreCodeTags(doc)
          };

          // remove all newlines and collapse spaces
          clean(doc);

          // some stuff, like accidental reference links must now be escaped
          // TODO
          // doc.innerHTML = doc.innerHTML.replace(/\[[\S\t ]]/);

          var nodes = doc.childNodes,
            mdDoc = '';
          for (var i = 0; i < nodes.length; i++) {
            mdDoc += showdown.subParser('makeMarkdown.node')(nodes[i], globals);
          }
          function clean(node) {
            for (var n = 0; n < node.childNodes.length; ++n) {
              var child = node.childNodes[n];
              if (child.nodeType === 3) {
                if (!/\S/.test(child.nodeValue) && !/^[ ]+$/.test(child.nodeValue)) {
                  node.removeChild(child);
                  --n;
                } else {
                  child.nodeValue = child.nodeValue.split('\n').join(' ');
                  child.nodeValue = child.nodeValue.replace(/(\s)+/g, '$1');
                }
              } else if (child.nodeType === 1) {
                clean(child);
              }
            }
          }

          // find all pre tags and replace contents with placeholder
          // we need this so that we can remove all indentation from html
          // to ease up parsing
          function substitutePreCodeTags(doc) {
            var pres = doc.querySelectorAll('pre'),
              presPH = [];
            for (var i = 0; i < pres.length; ++i) {
              if (pres[i].childElementCount === 1 && pres[i].firstChild.tagName.toLowerCase() === 'code') {
                var content = pres[i].firstChild.innerHTML.trim(),
                  language = pres[i].firstChild.getAttribute('data-language') || '';

                // if data-language attribute is not defined, then we look for class language-*
                if (language === '') {
                  var classes = pres[i].firstChild.className.split(' ');
                  for (var c = 0; c < classes.length; ++c) {
                    var matches = classes[c].match(/^language-(.+)$/);
                    if (matches !== null) {
                      language = matches[1];
                      break;
                    }
                  }
                }

                // unescape html entities in content
                content = showdown.helper.unescapeHTMLEntities(content);
                presPH.push(content);
                pres[i].outerHTML = '<precode language="' + language + '" precodenum="' + i.toString() + '"></precode>';
              } else {
                presPH.push(pres[i].innerHTML);
                pres[i].innerHTML = '';
                pres[i].setAttribute('prenum', i.toString());
              }
            }
            return presPH;
          }
          return mdDoc;
        };

        /**
         * Set an option of this Converter instance
         * @param {string} key
         * @param {*} value
         */
        this.setOption = function (key, value) {
          options[key] = value;
        };

        /**
         * Get the option of this Converter instance
         * @param {string} key
         * @returns {*}
         */
        this.getOption = function (key) {
          return options[key];
        };

        /**
         * Get the options of this Converter instance
         * @returns {{}}
         */
        this.getOptions = function () {
          return options;
        };

        /**
         * Add extension to THIS converter
         * @param {{}} extension
         * @param {string} [name=null]
         */
        this.addExtension = function (extension, name) {
          name = name || null;
          _parseExtension(extension, name);
        };

        /**
         * Use a global registered extension with THIS converter
         * @param {string} extensionName Name of the previously registered extension
         */
        this.useExtension = function (extensionName) {
          _parseExtension(extensionName);
        };

        /**
         * Set the flavor THIS converter should use
         * @param {string} name
         */
        this.setFlavor = function (name) {
          if (!flavor.hasOwnProperty(name)) {
            throw Error(name + ' flavor was not found');
          }
          var preset = flavor[name];
          setConvFlavor = name;
          for (var option in preset) {
            if (preset.hasOwnProperty(option)) {
              options[option] = preset[option];
            }
          }
        };

        /**
         * Get the currently set flavor of this converter
         * @returns {string}
         */
        this.getFlavor = function () {
          return setConvFlavor;
        };

        /**
         * Remove an extension from THIS converter.
         * Note: This is a costly operation. It's better to initialize a new converter
         * and specify the extensions you wish to use
         * @param {Array} extension
         */
        this.removeExtension = function (extension) {
          if (!showdown.helper.isArray(extension)) {
            extension = [extension];
          }
          for (var a = 0; a < extension.length; ++a) {
            var ext = extension[a];
            for (var i = 0; i < langExtensions.length; ++i) {
              if (langExtensions[i] === ext) {
                langExtensions.splice(i, 1);
              }
            }
            for (var ii = 0; ii < outputModifiers.length; ++ii) {
              if (outputModifiers[ii] === ext) {
                outputModifiers.splice(ii, 1);
              }
            }
          }
        };

        /**
         * Get all extension of THIS converter
         * @returns {{language: Array, output: Array}}
         */
        this.getAllExtensions = function () {
          return {
            language: langExtensions,
            output: outputModifiers
          };
        };

        /**
         * Get the metadata of the previously parsed document
         * @param raw
         * @returns {string|{}}
         */
        this.getMetadata = function (raw) {
          if (raw) {
            return metadata.raw;
          } else {
            return metadata.parsed;
          }
        };

        /**
         * Get the metadata format of the previously parsed document
         * @returns {string}
         */
        this.getMetadataFormat = function () {
          return metadata.format;
        };

        /**
         * Private: set a single key, value metadata pair
         * @param {string} key
         * @param {string} value
         */
        this._setMetadataPair = function (key, value) {
          metadata.parsed[key] = value;
        };

        /**
         * Private: set metadata format
         * @param {string} format
         */
        this._setMetadataFormat = function (format) {
          metadata.format = format;
        };

        /**
         * Private: set metadata raw text
         * @param {string} raw
         */
        this._setMetadataRaw = function (raw) {
          metadata.raw = raw;
        };
      };

      /**
       * Turn Markdown link shortcuts into XHTML <a> tags.
       */
      showdown.subParser('anchors', function (text, options, globals) {

        text = globals.converter._dispatch('anchors.before', text, options, globals);
        var writeAnchorTag = function (wholeMatch, linkText, linkId, url, m5, m6, title) {
          if (showdown.helper.isUndefined(title)) {
            title = '';
          }
          linkId = linkId.toLowerCase();

          // Special case for explicit empty url
          if (wholeMatch.search(/\(<?\s*>? ?(['"].*['"])?\)$/m) > -1) {
            url = '';
          } else if (!url) {
            if (!linkId) {
              // lower-case and turn embedded newlines into spaces
              linkId = linkText.toLowerCase().replace(/ ?\n/g, ' ');
            }
            url = '#' + linkId;
            if (!showdown.helper.isUndefined(globals.gUrls[linkId])) {
              url = globals.gUrls[linkId];
              if (!showdown.helper.isUndefined(globals.gTitles[linkId])) {
                title = globals.gTitles[linkId];
              }
            } else {
              return wholeMatch;
            }
          }

          //url = showdown.helper.escapeCharacters(url, '*_', false); // replaced line to improve performance
          url = url.replace(showdown.helper.regexes.asteriskDashAndColon, showdown.helper.escapeCharactersCallback);
          var result = '<a href="' + url + '"';
          if (title !== '' && title !== null) {
            title = title.replace(/"/g, '&quot;');
            //title = showdown.helper.escapeCharacters(title, '*_', false); // replaced line to improve performance
            title = title.replace(showdown.helper.regexes.asteriskDashAndColon, showdown.helper.escapeCharactersCallback);
            result += ' title="' + title + '"';
          }

          // optionLinksInNewWindow only applies
          // to external links. Hash links (#) open in same page
          if (options.openLinksInNewWindow && !/^#/.test(url)) {
            // escaped _
            result += ' rel="noopener noreferrer" target="¨E95Eblank"';
          }
          result += '>' + linkText + '</a>';
          return result;
        };

        // First, handle reference-style links: [link text] [id]
        text = text.replace(/\[((?:\[[^\]]*]|[^\[\]])*)] ?(?:\n *)?\[(.*?)]()()()()/g, writeAnchorTag);

        // Next, inline-style links: [link text](url "optional title")
        // cases with crazy urls like ./image/cat1).png
        text = text.replace(/\[((?:\[[^\]]*]|[^\[\]])*)]()[ \t]*\([ \t]?<([^>]*)>(?:[ \t]*((["'])([^"]*?)\5))?[ \t]?\)/g, writeAnchorTag);

        // normal cases
        text = text.replace(/\[((?:\[[^\]]*]|[^\[\]])*)]()[ \t]*\([ \t]?<?([\S]+?(?:\([\S]*?\)[\S]*?)?)>?(?:[ \t]*((["'])([^"]*?)\5))?[ \t]?\)/g, writeAnchorTag);

        // handle reference-style shortcuts: [link text]
        // These must come last in case you've also got [link test][1]
        // or [link test](/foo)
        text = text.replace(/\[([^\[\]]+)]()()()()()/g, writeAnchorTag);

        // Lastly handle GithubMentions if option is enabled
        if (options.ghMentions) {
          text = text.replace(/(^|\s)(\\)?(@([a-z\d]+(?:[a-z\d.-]+?[a-z\d]+)*))/gmi, function (wm, st, escape, mentions, username) {
            if (escape === '\\') {
              return st + mentions;
            }

            //check if options.ghMentionsLink is a string
            if (!showdown.helper.isString(options.ghMentionsLink)) {
              throw new Error('ghMentionsLink option must be a string');
            }
            var lnk = options.ghMentionsLink.replace(/\{u}/g, username),
              target = '';
            if (options.openLinksInNewWindow) {
              target = ' rel="noopener noreferrer" target="¨E95Eblank"';
            }
            return st + '<a href="' + lnk + '"' + target + '>' + mentions + '</a>';
          });
        }
        text = globals.converter._dispatch('anchors.after', text, options, globals);
        return text;
      });

      // url allowed chars [a-z\d_.~:/?#[]@!$&'()*+,;=-]

      var simpleURLRegex = /([*~_]+|\b)(((https?|ftp|dict):\/\/|www\.)[^'">\s]+?\.[^'">\s]+?)()(\1)?(?=\s|$)(?!["<>])/gi,
        simpleURLRegex2 = /([*~_]+|\b)(((https?|ftp|dict):\/\/|www\.)[^'">\s]+\.[^'">\s]+?)([.!?,()\[\]])?(\1)?(?=\s|$)(?!["<>])/gi,
        delimUrlRegex = /()<(((https?|ftp|dict):\/\/|www\.)[^'">\s]+)()>()/gi,
        simpleMailRegex = /(^|\s)(?:mailto:)?([A-Za-z0-9!#$%&'*+-/=?^_`{|}~.]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)(?=$|\s)/gmi,
        delimMailRegex = /<()(?:mailto:)?([-.\w]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi,
        replaceLink = function (options) {

          return function (wm, leadingMagicChars, link, m2, m3, trailingPunctuation, trailingMagicChars) {
            link = link.replace(showdown.helper.regexes.asteriskDashAndColon, showdown.helper.escapeCharactersCallback);
            var lnkTxt = link,
              append = '',
              target = '',
              lmc = leadingMagicChars || '',
              tmc = trailingMagicChars || '';
            if (/^www\./i.test(link)) {
              link = link.replace(/^www\./i, 'http://www.');
            }
            if (options.excludeTrailingPunctuationFromURLs && trailingPunctuation) {
              append = trailingPunctuation;
            }
            if (options.openLinksInNewWindow) {
              target = ' rel="noopener noreferrer" target="¨E95Eblank"';
            }
            return lmc + '<a href="' + link + '"' + target + '>' + lnkTxt + '</a>' + append + tmc;
          };
        },
        replaceMail = function (options, globals) {

          return function (wholeMatch, b, mail) {
            var href = 'mailto:';
            b = b || '';
            mail = showdown.subParser('unescapeSpecialChars')(mail, options, globals);
            if (options.encodeEmails) {
              href = showdown.helper.encodeEmailAddress(href + mail);
              mail = showdown.helper.encodeEmailAddress(mail);
            } else {
              href = href + mail;
            }
            return b + '<a href="' + href + '">' + mail + '</a>';
          };
        };
      showdown.subParser('autoLinks', function (text, options, globals) {

        text = globals.converter._dispatch('autoLinks.before', text, options, globals);
        text = text.replace(delimUrlRegex, replaceLink(options));
        text = text.replace(delimMailRegex, replaceMail(options, globals));
        text = globals.converter._dispatch('autoLinks.after', text, options, globals);
        return text;
      });
      showdown.subParser('simplifiedAutoLinks', function (text, options, globals) {

        if (!options.simplifiedAutoLink) {
          return text;
        }
        text = globals.converter._dispatch('simplifiedAutoLinks.before', text, options, globals);
        if (options.excludeTrailingPunctuationFromURLs) {
          text = text.replace(simpleURLRegex2, replaceLink(options));
        } else {
          text = text.replace(simpleURLRegex, replaceLink(options));
        }
        text = text.replace(simpleMailRegex, replaceMail(options, globals));
        text = globals.converter._dispatch('simplifiedAutoLinks.after', text, options, globals);
        return text;
      });

      /**
       * These are all the transformations that form block-level
       * tags like paragraphs, headers, and list items.
       */
      showdown.subParser('blockGamut', function (text, options, globals) {

        text = globals.converter._dispatch('blockGamut.before', text, options, globals);

        // we parse blockquotes first so that we can have headings and hrs
        // inside blockquotes
        text = showdown.subParser('blockQuotes')(text, options, globals);
        text = showdown.subParser('headers')(text, options, globals);

        // Do Horizontal Rules:
        text = showdown.subParser('horizontalRule')(text, options, globals);
        text = showdown.subParser('lists')(text, options, globals);
        text = showdown.subParser('codeBlocks')(text, options, globals);
        text = showdown.subParser('tables')(text, options, globals);

        // We already ran _HashHTMLBlocks() before, in Markdown(), but that
        // was to escape raw HTML in the original Markdown source. This time,
        // we're escaping the markup we've just created, so that we don't wrap
        // <p> tags around block-level tags.
        text = showdown.subParser('hashHTMLBlocks')(text, options, globals);
        text = showdown.subParser('paragraphs')(text, options, globals);
        text = globals.converter._dispatch('blockGamut.after', text, options, globals);
        return text;
      });
      showdown.subParser('blockQuotes', function (text, options, globals) {

        text = globals.converter._dispatch('blockQuotes.before', text, options, globals);

        // add a couple extra lines after the text and endtext mark
        text = text + '\n\n';
        var rgx = /(^ {0,3}>[ \t]?.+\n(.+\n)*\n*)+/gm;
        if (options.splitAdjacentBlockquotes) {
          rgx = /^ {0,3}>[\s\S]*?(?:\n\n)/gm;
        }
        text = text.replace(rgx, function (bq) {
          // attacklab: hack around Konqueror 3.5.4 bug:
          // "----------bug".replace(/^-/g,"") == "bug"
          bq = bq.replace(/^[ \t]*>[ \t]?/gm, ''); // trim one level of quoting

          // attacklab: clean up hack
          bq = bq.replace(/¨0/g, '');
          bq = bq.replace(/^[ \t]+$/gm, ''); // trim whitespace-only lines
          bq = showdown.subParser('githubCodeBlocks')(bq, options, globals);
          bq = showdown.subParser('blockGamut')(bq, options, globals); // recurse

          bq = bq.replace(/(^|\n)/g, '$1  ');
          // These leading spaces screw with <pre> content, so we need to fix that:
          bq = bq.replace(/(\s*<pre>[^\r]+?<\/pre>)/gm, function (wholeMatch, m1) {
            var pre = m1;
            // attacklab: hack around Konqueror 3.5.4 bug:
            pre = pre.replace(/^  /mg, '¨0');
            pre = pre.replace(/¨0/g, '');
            return pre;
          });
          return showdown.subParser('hashBlock')('<blockquote>\n' + bq + '\n</blockquote>', options, globals);
        });
        text = globals.converter._dispatch('blockQuotes.after', text, options, globals);
        return text;
      });

      /**
       * Process Markdown `<pre><code>` blocks.
       */
      showdown.subParser('codeBlocks', function (text, options, globals) {

        text = globals.converter._dispatch('codeBlocks.before', text, options, globals);

        // sentinel workarounds for lack of \A and \Z, safari\khtml bug
        text += '¨0';
        var pattern = /(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=¨0))/g;
        text = text.replace(pattern, function (wholeMatch, m1, m2) {
          var codeblock = m1,
            nextChar = m2,
            end = '\n';
          codeblock = showdown.subParser('outdent')(codeblock, options, globals);
          codeblock = showdown.subParser('encodeCode')(codeblock, options, globals);
          codeblock = showdown.subParser('detab')(codeblock, options, globals);
          codeblock = codeblock.replace(/^\n+/g, ''); // trim leading newlines
          codeblock = codeblock.replace(/\n+$/g, ''); // trim trailing newlines

          if (options.omitExtraWLInCodeBlocks) {
            end = '';
          }
          codeblock = '<pre><code>' + codeblock + end + '</code></pre>';
          return showdown.subParser('hashBlock')(codeblock, options, globals) + nextChar;
        });

        // strip sentinel
        text = text.replace(/¨0/, '');
        text = globals.converter._dispatch('codeBlocks.after', text, options, globals);
        return text;
      });

      /**
       *
       *   *  Backtick quotes are used for <code></code> spans.
       *
       *   *  You can use multiple backticks as the delimiters if you want to
       *     include literal backticks in the code span. So, this input:
       *
       *         Just type ``foo `bar` baz`` at the prompt.
       *
       *       Will translate to:
       *
       *         <p>Just type <code>foo `bar` baz</code> at the prompt.</p>
       *
       *    There's no arbitrary limit to the number of backticks you
       *    can use as delimters. If you need three consecutive backticks
       *    in your code, use four for delimiters, etc.
       *
       *  *  You can use spaces to get literal backticks at the edges:
       *
       *         ... type `` `bar` `` ...
       *
       *       Turns to:
       *
       *         ... type <code>`bar`</code> ...
       */
      showdown.subParser('codeSpans', function (text, options, globals) {

        text = globals.converter._dispatch('codeSpans.before', text, options, globals);
        if (typeof text === 'undefined') {
          text = '';
        }
        text = text.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm, function (wholeMatch, m1, m2, m3) {
          var c = m3;
          c = c.replace(/^([ \t]*)/g, ''); // leading whitespace
          c = c.replace(/[ \t]*$/g, ''); // trailing whitespace
          c = showdown.subParser('encodeCode')(c, options, globals);
          c = m1 + '<code>' + c + '</code>';
          c = showdown.subParser('hashHTMLSpans')(c, options, globals);
          return c;
        });
        text = globals.converter._dispatch('codeSpans.after', text, options, globals);
        return text;
      });

      /**
       * Create a full HTML document from the processed markdown
       */
      showdown.subParser('completeHTMLDocument', function (text, options, globals) {

        if (!options.completeHTMLDocument) {
          return text;
        }
        text = globals.converter._dispatch('completeHTMLDocument.before', text, options, globals);
        var doctype = 'html',
          doctypeParsed = '<!DOCTYPE HTML>\n',
          title = '',
          charset = '<meta charset="utf-8">\n',
          lang = '',
          metadata = '';
        if (typeof globals.metadata.parsed.doctype !== 'undefined') {
          doctypeParsed = '<!DOCTYPE ' + globals.metadata.parsed.doctype + '>\n';
          doctype = globals.metadata.parsed.doctype.toString().toLowerCase();
          if (doctype === 'html' || doctype === 'html5') {
            charset = '<meta charset="utf-8">';
          }
        }
        for (var meta in globals.metadata.parsed) {
          if (globals.metadata.parsed.hasOwnProperty(meta)) {
            switch (meta.toLowerCase()) {
              case 'doctype':
                break;
              case 'title':
                title = '<title>' + globals.metadata.parsed.title + '</title>\n';
                break;
              case 'charset':
                if (doctype === 'html' || doctype === 'html5') {
                  charset = '<meta charset="' + globals.metadata.parsed.charset + '">\n';
                } else {
                  charset = '<meta name="charset" content="' + globals.metadata.parsed.charset + '">\n';
                }
                break;
              case 'language':
              case 'lang':
                lang = ' lang="' + globals.metadata.parsed[meta] + '"';
                metadata += '<meta name="' + meta + '" content="' + globals.metadata.parsed[meta] + '">\n';
                break;
              default:
                metadata += '<meta name="' + meta + '" content="' + globals.metadata.parsed[meta] + '">\n';
            }
          }
        }
        text = doctypeParsed + '<html' + lang + '>\n<head>\n' + title + charset + metadata + '</head>\n<body>\n' + text.trim() + '\n</body>\n</html>';
        text = globals.converter._dispatch('completeHTMLDocument.after', text, options, globals);
        return text;
      });

      /**
       * Convert all tabs to spaces
       */
      showdown.subParser('detab', function (text, options, globals) {

        text = globals.converter._dispatch('detab.before', text, options, globals);

        // expand first n-1 tabs
        text = text.replace(/\t(?=\t)/g, '    '); // g_tab_width

        // replace the nth with two sentinels
        text = text.replace(/\t/g, '¨A¨B');

        // use the sentinel to anchor our regex so it doesn't explode
        text = text.replace(/¨B(.+?)¨A/g, function (wholeMatch, m1) {
          var leadingText = m1,
            numSpaces = 4 - leadingText.length % 4; // g_tab_width

          // there *must* be a better way to do this:
          for (var i = 0; i < numSpaces; i++) {
            leadingText += ' ';
          }
          return leadingText;
        });

        // clean up sentinels
        text = text.replace(/¨A/g, '    '); // g_tab_width
        text = text.replace(/¨B/g, '');
        text = globals.converter._dispatch('detab.after', text, options, globals);
        return text;
      });
      showdown.subParser('ellipsis', function (text, options, globals) {

        if (!options.ellipsis) {
          return text;
        }
        text = globals.converter._dispatch('ellipsis.before', text, options, globals);
        text = text.replace(/\.\.\./g, '…');
        text = globals.converter._dispatch('ellipsis.after', text, options, globals);
        return text;
      });

      /**
       * Turn emoji codes into emojis
       *
       * List of supported emojis: https://github.com/showdownjs/showdown/wiki/Emojis
       */
      showdown.subParser('emoji', function (text, options, globals) {

        if (!options.emoji) {
          return text;
        }
        text = globals.converter._dispatch('emoji.before', text, options, globals);
        var emojiRgx = /:([\S]+?):/g;
        text = text.replace(emojiRgx, function (wm, emojiCode) {
          if (showdown.helper.emojis.hasOwnProperty(emojiCode)) {
            return showdown.helper.emojis[emojiCode];
          }
          return wm;
        });
        text = globals.converter._dispatch('emoji.after', text, options, globals);
        return text;
      });

      /**
       * Smart processing for ampersands and angle brackets that need to be encoded.
       */
      showdown.subParser('encodeAmpsAndAngles', function (text, options, globals) {

        text = globals.converter._dispatch('encodeAmpsAndAngles.before', text, options, globals);

        // Ampersand-encoding based entirely on Nat Irons's Amputator MT plugin:
        // http://bumppo.net/projects/amputator/
        text = text.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g, '&amp;');

        // Encode naked <'s
        text = text.replace(/<(?![a-z\/?$!])/gi, '&lt;');

        // Encode <
        text = text.replace(/</g, '&lt;');

        // Encode >
        text = text.replace(/>/g, '&gt;');
        text = globals.converter._dispatch('encodeAmpsAndAngles.after', text, options, globals);
        return text;
      });

      /**
       * Returns the string, with after processing the following backslash escape sequences.
       *
       * attacklab: The polite way to do this is with the new escapeCharacters() function:
       *
       *    text = escapeCharacters(text,"\\",true);
       *    text = escapeCharacters(text,"`*_{}[]()>#+-.!",true);
       *
       * ...but we're sidestepping its use of the (slow) RegExp constructor
       * as an optimization for Firefox.  This function gets called a LOT.
       */
      showdown.subParser('encodeBackslashEscapes', function (text, options, globals) {

        text = globals.converter._dispatch('encodeBackslashEscapes.before', text, options, globals);
        text = text.replace(/\\(\\)/g, showdown.helper.escapeCharactersCallback);
        text = text.replace(/\\([`*_{}\[\]()>#+.!~=|:-])/g, showdown.helper.escapeCharactersCallback);
        text = globals.converter._dispatch('encodeBackslashEscapes.after', text, options, globals);
        return text;
      });

      /**
       * Encode/escape certain characters inside Markdown code runs.
       * The point is that in code, these characters are literals,
       * and lose their special Markdown meanings.
       */
      showdown.subParser('encodeCode', function (text, options, globals) {

        text = globals.converter._dispatch('encodeCode.before', text, options, globals);

        // Encode all ampersands; HTML entities are not
        // entities within a Markdown code span.
        text = text.replace(/&/g, '&amp;')
        // Do the angle bracket song and dance:
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // Now, escape characters that are magic in Markdown:
        .replace(/([*_{}\[\]\\=~-])/g, showdown.helper.escapeCharactersCallback);
        text = globals.converter._dispatch('encodeCode.after', text, options, globals);
        return text;
      });

      /**
       * Within tags -- meaning between < and > -- encode [\ ` * _ ~ =] so they
       * don't conflict with their use in Markdown for code, italics and strong.
       */
      showdown.subParser('escapeSpecialCharsWithinTagAttributes', function (text, options, globals) {

        text = globals.converter._dispatch('escapeSpecialCharsWithinTagAttributes.before', text, options, globals);

        // Build a regex to find HTML tags.
        var tags = /<\/?[a-z\d_:-]+(?:[\s]+[\s\S]+?)?>/gi,
          comments = /<!(--(?:(?:[^>-]|-[^>])(?:[^-]|-[^-])*)--)>/gi;
        text = text.replace(tags, function (wholeMatch) {
          return wholeMatch.replace(/(.)<\/?code>(?=.)/g, '$1`').replace(/([\\`*_~=|])/g, showdown.helper.escapeCharactersCallback);
        });
        text = text.replace(comments, function (wholeMatch) {
          return wholeMatch.replace(/([\\`*_~=|])/g, showdown.helper.escapeCharactersCallback);
        });
        text = globals.converter._dispatch('escapeSpecialCharsWithinTagAttributes.after', text, options, globals);
        return text;
      });

      /**
       * Handle github codeblocks prior to running HashHTML so that
       * HTML contained within the codeblock gets escaped properly
       * Example:
       * ```ruby
       *     def hello_world(x)
       *       puts "Hello, #{x}"
       *     end
       * ```
       */
      showdown.subParser('githubCodeBlocks', function (text, options, globals) {

        // early exit if option is not enabled
        if (!options.ghCodeBlocks) {
          return text;
        }
        text = globals.converter._dispatch('githubCodeBlocks.before', text, options, globals);
        text += '¨0';
        text = text.replace(/(?:^|\n)(?: {0,3})(```+|~~~+)(?: *)([^\s`~]*)\n([\s\S]*?)\n(?: {0,3})\1/g, function (wholeMatch, delim, language, codeblock) {
          var end = options.omitExtraWLInCodeBlocks ? '' : '\n';

          // First parse the github code block
          codeblock = showdown.subParser('encodeCode')(codeblock, options, globals);
          codeblock = showdown.subParser('detab')(codeblock, options, globals);
          codeblock = codeblock.replace(/^\n+/g, ''); // trim leading newlines
          codeblock = codeblock.replace(/\n+$/g, ''); // trim trailing whitespace

          codeblock = '<pre><code' + (language ? ' class="' + language + ' language-' + language + '"' : '') + '>' + codeblock + end + '</code></pre>';
          codeblock = showdown.subParser('hashBlock')(codeblock, options, globals);

          // Since GHCodeblocks can be false positives, we need to
          // store the primitive text and the parsed text in a global var,
          // and then return a token
          return '\n\n¨G' + (globals.ghCodeBlocks.push({
            text: wholeMatch,
            codeblock: codeblock
          }) - 1) + 'G\n\n';
        });

        // attacklab: strip sentinel
        text = text.replace(/¨0/, '');
        return globals.converter._dispatch('githubCodeBlocks.after', text, options, globals);
      });
      showdown.subParser('hashBlock', function (text, options, globals) {

        text = globals.converter._dispatch('hashBlock.before', text, options, globals);
        text = text.replace(/(^\n+|\n+$)/g, '');
        text = '\n\n¨K' + (globals.gHtmlBlocks.push(text) - 1) + 'K\n\n';
        text = globals.converter._dispatch('hashBlock.after', text, options, globals);
        return text;
      });

      /**
       * Hash and escape <code> elements that should not be parsed as markdown
       */
      showdown.subParser('hashCodeTags', function (text, options, globals) {

        text = globals.converter._dispatch('hashCodeTags.before', text, options, globals);
        var repFunc = function (wholeMatch, match, left, right) {
          var codeblock = left + showdown.subParser('encodeCode')(match, options, globals) + right;
          return '¨C' + (globals.gHtmlSpans.push(codeblock) - 1) + 'C';
        };

        // Hash naked <code>
        text = showdown.helper.replaceRecursiveRegExp(text, repFunc, '<code\\b[^>]*>', '</code>', 'gim');
        text = globals.converter._dispatch('hashCodeTags.after', text, options, globals);
        return text;
      });
      showdown.subParser('hashElement', function (text, options, globals) {

        return function (wholeMatch, m1) {
          var blockText = m1;

          // Undo double lines
          blockText = blockText.replace(/\n\n/g, '\n');
          blockText = blockText.replace(/^\n/, '');

          // strip trailing blank lines
          blockText = blockText.replace(/\n+$/g, '');

          // Replace the element text with a marker ("¨KxK" where x is its key)
          blockText = '\n\n¨K' + (globals.gHtmlBlocks.push(blockText) - 1) + 'K\n\n';
          return blockText;
        };
      });
      showdown.subParser('hashHTMLBlocks', function (text, options, globals) {

        text = globals.converter._dispatch('hashHTMLBlocks.before', text, options, globals);
        var blockTags = ['pre', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'table', 'dl', 'ol', 'ul', 'script', 'noscript', 'form', 'fieldset', 'iframe', 'math', 'style', 'section', 'header', 'footer', 'nav', 'article', 'aside', 'address', 'audio', 'canvas', 'figure', 'hgroup', 'output', 'video', 'p'],
          repFunc = function (wholeMatch, match, left, right) {
            var txt = wholeMatch;
            // check if this html element is marked as markdown
            // if so, it's contents should be parsed as markdown
            if (left.search(/\bmarkdown\b/) !== -1) {
              txt = left + globals.converter.makeHtml(match) + right;
            }
            return '\n\n¨K' + (globals.gHtmlBlocks.push(txt) - 1) + 'K\n\n';
          };
        if (options.backslashEscapesHTMLTags) {
          // encode backslash escaped HTML tags
          text = text.replace(/\\<(\/?[^>]+?)>/g, function (wm, inside) {
            return '&lt;' + inside + '&gt;';
          });
        }

        // hash HTML Blocks
        for (var i = 0; i < blockTags.length; ++i) {
          var opTagPos,
            rgx1 = new RegExp('^ {0,3}(<' + blockTags[i] + '\\b[^>]*>)', 'im'),
            patLeft = '<' + blockTags[i] + '\\b[^>]*>',
            patRight = '</' + blockTags[i] + '>';
          // 1. Look for the first position of the first opening HTML tag in the text
          while ((opTagPos = showdown.helper.regexIndexOf(text, rgx1)) !== -1) {
            // if the HTML tag is \ escaped, we need to escape it and break

            //2. Split the text in that position
            var subTexts = showdown.helper.splitAtIndex(text, opTagPos),
              //3. Match recursively
              newSubText1 = showdown.helper.replaceRecursiveRegExp(subTexts[1], repFunc, patLeft, patRight, 'im');

            // prevent an infinite loop
            if (newSubText1 === subTexts[1]) {
              break;
            }
            text = subTexts[0].concat(newSubText1);
          }
        }
        // HR SPECIAL CASE
        text = text.replace(/(\n {0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g, showdown.subParser('hashElement')(text, options, globals));

        // Special case for standalone HTML comments
        text = showdown.helper.replaceRecursiveRegExp(text, function (txt) {
          return '\n\n¨K' + (globals.gHtmlBlocks.push(txt) - 1) + 'K\n\n';
        }, '^ {0,3}<!--', '-->', 'gm');

        // PHP and ASP-style processor instructions (<?...?> and <%...%>)
        text = text.replace(/(?:\n\n)( {0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g, showdown.subParser('hashElement')(text, options, globals));
        text = globals.converter._dispatch('hashHTMLBlocks.after', text, options, globals);
        return text;
      });

      /**
       * Hash span elements that should not be parsed as markdown
       */
      showdown.subParser('hashHTMLSpans', function (text, options, globals) {

        text = globals.converter._dispatch('hashHTMLSpans.before', text, options, globals);
        function hashHTMLSpan(html) {
          return '¨C' + (globals.gHtmlSpans.push(html) - 1) + 'C';
        }

        // Hash Self Closing tags
        text = text.replace(/<[^>]+?\/>/gi, function (wm) {
          return hashHTMLSpan(wm);
        });

        // Hash tags without properties
        text = text.replace(/<([^>]+?)>[\s\S]*?<\/\1>/g, function (wm) {
          return hashHTMLSpan(wm);
        });

        // Hash tags with properties
        text = text.replace(/<([^>]+?)\s[^>]+?>[\s\S]*?<\/\1>/g, function (wm) {
          return hashHTMLSpan(wm);
        });

        // Hash self closing tags without />
        text = text.replace(/<[^>]+?>/gi, function (wm) {
          return hashHTMLSpan(wm);
        });

        /*showdown.helper.matchRecursiveRegExp(text, '<code\\b[^>]*>', '</code>', 'gi');*/

        text = globals.converter._dispatch('hashHTMLSpans.after', text, options, globals);
        return text;
      });

      /**
       * Unhash HTML spans
       */
      showdown.subParser('unhashHTMLSpans', function (text, options, globals) {

        text = globals.converter._dispatch('unhashHTMLSpans.before', text, options, globals);
        for (var i = 0; i < globals.gHtmlSpans.length; ++i) {
          var repText = globals.gHtmlSpans[i],
            // limiter to prevent infinite loop (assume 10 as limit for recurse)
            limit = 0;
          while (/¨C(\d+)C/.test(repText)) {
            var num = RegExp.$1;
            repText = repText.replace('¨C' + num + 'C', globals.gHtmlSpans[num]);
            if (limit === 10) {
              console.error('maximum nesting of 10 spans reached!!!');
              break;
            }
            ++limit;
          }
          text = text.replace('¨C' + i + 'C', repText);
        }
        text = globals.converter._dispatch('unhashHTMLSpans.after', text, options, globals);
        return text;
      });

      /**
       * Hash and escape <pre><code> elements that should not be parsed as markdown
       */
      showdown.subParser('hashPreCodeTags', function (text, options, globals) {

        text = globals.converter._dispatch('hashPreCodeTags.before', text, options, globals);
        var repFunc = function (wholeMatch, match, left, right) {
          // encode html entities
          var codeblock = left + showdown.subParser('encodeCode')(match, options, globals) + right;
          return '\n\n¨G' + (globals.ghCodeBlocks.push({
            text: wholeMatch,
            codeblock: codeblock
          }) - 1) + 'G\n\n';
        };

        // Hash <pre><code>
        text = showdown.helper.replaceRecursiveRegExp(text, repFunc, '^ {0,3}<pre\\b[^>]*>\\s*<code\\b[^>]*>', '^ {0,3}</code>\\s*</pre>', 'gim');
        text = globals.converter._dispatch('hashPreCodeTags.after', text, options, globals);
        return text;
      });
      showdown.subParser('headers', function (text, options, globals) {

        text = globals.converter._dispatch('headers.before', text, options, globals);
        var headerLevelStart = isNaN(parseInt(options.headerLevelStart)) ? 1 : parseInt(options.headerLevelStart),
          // Set text-style headers:
          //	Header 1
          //	========
          //
          //	Header 2
          //	--------
          //
          setextRegexH1 = options.smoothLivePreview ? /^(.+)[ \t]*\n={2,}[ \t]*\n+/gm : /^(.+)[ \t]*\n=+[ \t]*\n+/gm,
          setextRegexH2 = options.smoothLivePreview ? /^(.+)[ \t]*\n-{2,}[ \t]*\n+/gm : /^(.+)[ \t]*\n-+[ \t]*\n+/gm;
        text = text.replace(setextRegexH1, function (wholeMatch, m1) {
          var spanGamut = showdown.subParser('spanGamut')(m1, options, globals),
            hID = options.noHeaderId ? '' : ' id="' + headerId(m1) + '"',
            hLevel = headerLevelStart,
            hashBlock = '<h' + hLevel + hID + '>' + spanGamut + '</h' + hLevel + '>';
          return showdown.subParser('hashBlock')(hashBlock, options, globals);
        });
        text = text.replace(setextRegexH2, function (matchFound, m1) {
          var spanGamut = showdown.subParser('spanGamut')(m1, options, globals),
            hID = options.noHeaderId ? '' : ' id="' + headerId(m1) + '"',
            hLevel = headerLevelStart + 1,
            hashBlock = '<h' + hLevel + hID + '>' + spanGamut + '</h' + hLevel + '>';
          return showdown.subParser('hashBlock')(hashBlock, options, globals);
        });

        // atx-style headers:
        //  # Header 1
        //  ## Header 2
        //  ## Header 2 with closing hashes ##
        //  ...
        //  ###### Header 6
        //
        var atxStyle = options.requireSpaceBeforeHeadingText ? /^(#{1,6})[ \t]+(.+?)[ \t]*#*\n+/gm : /^(#{1,6})[ \t]*(.+?)[ \t]*#*\n+/gm;
        text = text.replace(atxStyle, function (wholeMatch, m1, m2) {
          var hText = m2;
          if (options.customizedHeaderId) {
            hText = m2.replace(/\s?\{([^{]+?)}\s*$/, '');
          }
          var span = showdown.subParser('spanGamut')(hText, options, globals),
            hID = options.noHeaderId ? '' : ' id="' + headerId(m2) + '"',
            hLevel = headerLevelStart - 1 + m1.length,
            header = '<h' + hLevel + hID + '>' + span + '</h' + hLevel + '>';
          return showdown.subParser('hashBlock')(header, options, globals);
        });
        function headerId(m) {
          var title, prefix;

          // It is separate from other options to allow combining prefix and customized
          if (options.customizedHeaderId) {
            var match = m.match(/\{([^{]+?)}\s*$/);
            if (match && match[1]) {
              m = match[1];
            }
          }
          title = m;

          // Prefix id to prevent causing inadvertent pre-existing style matches.
          if (showdown.helper.isString(options.prefixHeaderId)) {
            prefix = options.prefixHeaderId;
          } else if (options.prefixHeaderId === true) {
            prefix = 'section-';
          } else {
            prefix = '';
          }
          if (!options.rawPrefixHeaderId) {
            title = prefix + title;
          }
          if (options.ghCompatibleHeaderId) {
            title = title.replace(/ /g, '-')
            // replace previously escaped chars (&, ¨ and $)
            .replace(/&amp;/g, '').replace(/¨T/g, '').replace(/¨D/g, '')
            // replace rest of the chars (&~$ are repeated as they might have been escaped)
            // borrowed from github's redcarpet (some they should produce similar results)
            .replace(/[&+$,\/:;=?@"#{}|^¨~\[\]`\\*)(%.!'<>]/g, '').toLowerCase();
          } else if (options.rawHeaderId) {
            title = title.replace(/ /g, '-')
            // replace previously escaped chars (&, ¨ and $)
            .replace(/&amp;/g, '&').replace(/¨T/g, '¨').replace(/¨D/g, '$')
            // replace " and '
            .replace(/["']/g, '-').toLowerCase();
          } else {
            title = title.replace(/[^\w]/g, '').toLowerCase();
          }
          if (options.rawPrefixHeaderId) {
            title = prefix + title;
          }
          if (globals.hashLinkCounts[title]) {
            title = title + '-' + globals.hashLinkCounts[title]++;
          } else {
            globals.hashLinkCounts[title] = 1;
          }
          return title;
        }
        text = globals.converter._dispatch('headers.after', text, options, globals);
        return text;
      });

      /**
       * Turn Markdown link shortcuts into XHTML <a> tags.
       */
      showdown.subParser('horizontalRule', function (text, options, globals) {

        text = globals.converter._dispatch('horizontalRule.before', text, options, globals);
        var key = showdown.subParser('hashBlock')('<hr />', options, globals);
        text = text.replace(/^ {0,2}( ?-){3,}[ \t]*$/gm, key);
        text = text.replace(/^ {0,2}( ?\*){3,}[ \t]*$/gm, key);
        text = text.replace(/^ {0,2}( ?_){3,}[ \t]*$/gm, key);
        text = globals.converter._dispatch('horizontalRule.after', text, options, globals);
        return text;
      });

      /**
       * Turn Markdown image shortcuts into <img> tags.
       */
      showdown.subParser('images', function (text, options, globals) {

        text = globals.converter._dispatch('images.before', text, options, globals);
        var inlineRegExp = /!\[([^\]]*?)][ \t]*()\([ \t]?<?([\S]+?(?:\([\S]*?\)[\S]*?)?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(["'])([^"]*?)\6)?[ \t]?\)/g,
          crazyRegExp = /!\[([^\]]*?)][ \t]*()\([ \t]?<([^>]*)>(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(?:(["'])([^"]*?)\6))?[ \t]?\)/g,
          base64RegExp = /!\[([^\]]*?)][ \t]*()\([ \t]?<?(data:.+?\/.+?;base64,[A-Za-z0-9+/=\n]+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(["'])([^"]*?)\6)?[ \t]?\)/g,
          referenceRegExp = /!\[([^\]]*?)] ?(?:\n *)?\[([\s\S]*?)]()()()()()/g,
          refShortcutRegExp = /!\[([^\[\]]+)]()()()()()/g;
        function writeImageTagBase64(wholeMatch, altText, linkId, url, width, height, m5, title) {
          url = url.replace(/\s/g, '');
          return writeImageTag(wholeMatch, altText, linkId, url, width, height, m5, title);
        }
        function writeImageTag(wholeMatch, altText, linkId, url, width, height, m5, title) {
          var gUrls = globals.gUrls,
            gTitles = globals.gTitles,
            gDims = globals.gDimensions;
          linkId = linkId.toLowerCase();
          if (!title) {
            title = '';
          }
          // Special case for explicit empty url
          if (wholeMatch.search(/\(<?\s*>? ?(['"].*['"])?\)$/m) > -1) {
            url = '';
          } else if (url === '' || url === null) {
            if (linkId === '' || linkId === null) {
              // lower-case and turn embedded newlines into spaces
              linkId = altText.toLowerCase().replace(/ ?\n/g, ' ');
            }
            url = '#' + linkId;
            if (!showdown.helper.isUndefined(gUrls[linkId])) {
              url = gUrls[linkId];
              if (!showdown.helper.isUndefined(gTitles[linkId])) {
                title = gTitles[linkId];
              }
              if (!showdown.helper.isUndefined(gDims[linkId])) {
                width = gDims[linkId].width;
                height = gDims[linkId].height;
              }
            } else {
              return wholeMatch;
            }
          }
          altText = altText.replace(/"/g, '&quot;')
          //altText = showdown.helper.escapeCharacters(altText, '*_', false);
          .replace(showdown.helper.regexes.asteriskDashAndColon, showdown.helper.escapeCharactersCallback);
          //url = showdown.helper.escapeCharacters(url, '*_', false);
          url = url.replace(showdown.helper.regexes.asteriskDashAndColon, showdown.helper.escapeCharactersCallback);
          var result = '<img src="' + url + '" alt="' + altText + '"';
          if (title && showdown.helper.isString(title)) {
            title = title.replace(/"/g, '&quot;')
            //title = showdown.helper.escapeCharacters(title, '*_', false);
            .replace(showdown.helper.regexes.asteriskDashAndColon, showdown.helper.escapeCharactersCallback);
            result += ' title="' + title + '"';
          }
          if (width && height) {
            width = width === '*' ? 'auto' : width;
            height = height === '*' ? 'auto' : height;
            result += ' width="' + width + '"';
            result += ' height="' + height + '"';
          }
          result += ' />';
          return result;
        }

        // First, handle reference-style labeled images: ![alt text][id]
        text = text.replace(referenceRegExp, writeImageTag);

        // Next, handle inline images:  ![alt text](url =<width>x<height> "optional title")

        // base64 encoded images
        text = text.replace(base64RegExp, writeImageTagBase64);

        // cases with crazy urls like ./image/cat1).png
        text = text.replace(crazyRegExp, writeImageTag);

        // normal cases
        text = text.replace(inlineRegExp, writeImageTag);

        // handle reference-style shortcuts: ![img text]
        text = text.replace(refShortcutRegExp, writeImageTag);
        text = globals.converter._dispatch('images.after', text, options, globals);
        return text;
      });
      showdown.subParser('italicsAndBold', function (text, options, globals) {

        text = globals.converter._dispatch('italicsAndBold.before', text, options, globals);

        // it's faster to have 3 separate regexes for each case than have just one
        // because of backtracing, in some cases, it could lead to an exponential effect
        // called "catastrophic backtrace". Ominous!

        function parseInside(txt, left, right) {
          /*
          if (options.simplifiedAutoLink) {
            txt = showdown.subParser('simplifiedAutoLinks')(txt, options, globals);
          }
          */
          return left + txt + right;
        }

        // Parse underscores
        if (options.literalMidWordUnderscores) {
          text = text.replace(/\b___(\S[\s\S]*?)___\b/g, function (wm, txt) {
            return parseInside(txt, '<strong><em>', '</em></strong>');
          });
          text = text.replace(/\b__(\S[\s\S]*?)__\b/g, function (wm, txt) {
            return parseInside(txt, '<strong>', '</strong>');
          });
          text = text.replace(/\b_(\S[\s\S]*?)_\b/g, function (wm, txt) {
            return parseInside(txt, '<em>', '</em>');
          });
        } else {
          text = text.replace(/___(\S[\s\S]*?)___/g, function (wm, m) {
            return /\S$/.test(m) ? parseInside(m, '<strong><em>', '</em></strong>') : wm;
          });
          text = text.replace(/__(\S[\s\S]*?)__/g, function (wm, m) {
            return /\S$/.test(m) ? parseInside(m, '<strong>', '</strong>') : wm;
          });
          text = text.replace(/_([^\s_][\s\S]*?)_/g, function (wm, m) {
            // !/^_[^_]/.test(m) - test if it doesn't start with __ (since it seems redundant, we removed it)
            return /\S$/.test(m) ? parseInside(m, '<em>', '</em>') : wm;
          });
        }

        // Now parse asterisks
        if (options.literalMidWordAsterisks) {
          text = text.replace(/([^*]|^)\B\*\*\*(\S[\s\S]*?)\*\*\*\B(?!\*)/g, function (wm, lead, txt) {
            return parseInside(txt, lead + '<strong><em>', '</em></strong>');
          });
          text = text.replace(/([^*]|^)\B\*\*(\S[\s\S]*?)\*\*\B(?!\*)/g, function (wm, lead, txt) {
            return parseInside(txt, lead + '<strong>', '</strong>');
          });
          text = text.replace(/([^*]|^)\B\*(\S[\s\S]*?)\*\B(?!\*)/g, function (wm, lead, txt) {
            return parseInside(txt, lead + '<em>', '</em>');
          });
        } else {
          text = text.replace(/\*\*\*(\S[\s\S]*?)\*\*\*/g, function (wm, m) {
            return /\S$/.test(m) ? parseInside(m, '<strong><em>', '</em></strong>') : wm;
          });
          text = text.replace(/\*\*(\S[\s\S]*?)\*\*/g, function (wm, m) {
            return /\S$/.test(m) ? parseInside(m, '<strong>', '</strong>') : wm;
          });
          text = text.replace(/\*([^\s*][\s\S]*?)\*/g, function (wm, m) {
            // !/^\*[^*]/.test(m) - test if it doesn't start with ** (since it seems redundant, we removed it)
            return /\S$/.test(m) ? parseInside(m, '<em>', '</em>') : wm;
          });
        }
        text = globals.converter._dispatch('italicsAndBold.after', text, options, globals);
        return text;
      });

      /**
       * Form HTML ordered (numbered) and unordered (bulleted) lists.
       */
      showdown.subParser('lists', function (text, options, globals) {

        /**
         * Process the contents of a single ordered or unordered list, splitting it
         * into individual list items.
         * @param {string} listStr
         * @param {boolean} trimTrailing
         * @returns {string}
         */
        function processListItems(listStr, trimTrailing) {
          // The $g_list_level global keeps track of when we're inside a list.
          // Each time we enter a list, we increment it; when we leave a list,
          // we decrement. If it's zero, we're not in a list anymore.
          //
          // We do this because when we're not inside a list, we want to treat
          // something like this:
          //
          //    I recommend upgrading to version
          //    8. Oops, now this line is treated
          //    as a sub-list.
          //
          // As a single paragraph, despite the fact that the second line starts
          // with a digit-period-space sequence.
          //
          // Whereas when we're inside a list (or sub-list), that line will be
          // treated as the start of a sub-list. What a kludge, huh? This is
          // an aspect of Markdown's syntax that's hard to parse perfectly
          // without resorting to mind-reading. Perhaps the solution is to
          // change the syntax rules such that sub-lists must start with a
          // starting cardinal number; e.g. "1." or "a.".
          globals.gListLevel++;

          // trim trailing blank lines:
          listStr = listStr.replace(/\n{2,}$/, '\n');

          // attacklab: add sentinel to emulate \z
          listStr += '¨0';
          var rgx = /(\n)?(^ {0,3})([*+-]|\d+[.])[ \t]+((\[(x|X| )?])?[ \t]*[^\r]+?(\n{1,2}))(?=\n*(¨0| {0,3}([*+-]|\d+[.])[ \t]+))/gm,
            isParagraphed = /\n[ \t]*\n(?!¨0)/.test(listStr);

          // Since version 1.5, nesting sublists requires 4 spaces (or 1 tab) indentation,
          // which is a syntax breaking change
          // activating this option reverts to old behavior
          if (options.disableForced4SpacesIndentedSublists) {
            rgx = /(\n)?(^ {0,3})([*+-]|\d+[.])[ \t]+((\[(x|X| )?])?[ \t]*[^\r]+?(\n{1,2}))(?=\n*(¨0|\2([*+-]|\d+[.])[ \t]+))/gm;
          }
          listStr = listStr.replace(rgx, function (wholeMatch, m1, m2, m3, m4, taskbtn, checked) {
            checked = checked && checked.trim() !== '';
            var item = showdown.subParser('outdent')(m4, options, globals),
              bulletStyle = '';

            // Support for github tasklists
            if (taskbtn && options.tasklists) {
              bulletStyle = ' class="task-list-item" style="list-style-type: none;"';
              item = item.replace(/^[ \t]*\[(x|X| )?]/m, function () {
                var otp = '<input type="checkbox" disabled style="margin: 0px 0.35em 0.25em -1.6em; vertical-align: middle;"';
                if (checked) {
                  otp += ' checked';
                }
                otp += '>';
                return otp;
              });
            }

            // ISSUE #312
            // This input: - - - a
            // causes trouble to the parser, since it interprets it as:
            // <ul><li><li><li>a</li></li></li></ul>
            // instead of:
            // <ul><li>- - a</li></ul>
            // So, to prevent it, we will put a marker (¨A)in the beginning of the line
            // Kind of hackish/monkey patching, but seems more effective than overcomplicating the list parser
            item = item.replace(/^([-*+]|\d\.)[ \t]+[\S\n ]*/g, function (wm2) {
              return '¨A' + wm2;
            });

            // m1 - Leading line or
            // Has a double return (multi paragraph) or
            // Has sublist
            if (m1 || item.search(/\n{2,}/) > -1) {
              item = showdown.subParser('githubCodeBlocks')(item, options, globals);
              item = showdown.subParser('blockGamut')(item, options, globals);
            } else {
              // Recursion for sub-lists:
              item = showdown.subParser('lists')(item, options, globals);
              item = item.replace(/\n$/, ''); // chomp(item)
              item = showdown.subParser('hashHTMLBlocks')(item, options, globals);

              // Colapse double linebreaks
              item = item.replace(/\n\n+/g, '\n\n');
              if (isParagraphed) {
                item = showdown.subParser('paragraphs')(item, options, globals);
              } else {
                item = showdown.subParser('spanGamut')(item, options, globals);
              }
            }

            // now we need to remove the marker (¨A)
            item = item.replace('¨A', '');
            // we can finally wrap the line in list item tags
            item = '<li' + bulletStyle + '>' + item + '</li>\n';
            return item;
          });

          // attacklab: strip sentinel
          listStr = listStr.replace(/¨0/g, '');
          globals.gListLevel--;
          if (trimTrailing) {
            listStr = listStr.replace(/\s+$/, '');
          }
          return listStr;
        }
        function styleStartNumber(list, listType) {
          // check if ol and starts by a number different than 1
          if (listType === 'ol') {
            var res = list.match(/^ *(\d+)\./);
            if (res && res[1] !== '1') {
              return ' start="' + res[1] + '"';
            }
          }
          return '';
        }

        /**
         * Check and parse consecutive lists (better fix for issue #142)
         * @param {string} list
         * @param {string} listType
         * @param {boolean} trimTrailing
         * @returns {string}
         */
        function parseConsecutiveLists(list, listType, trimTrailing) {
          // check if we caught 2 or more consecutive lists by mistake
          // we use the counterRgx, meaning if listType is UL we look for OL and vice versa
          var olRgx = options.disableForced4SpacesIndentedSublists ? /^ ?\d+\.[ \t]/gm : /^ {0,3}\d+\.[ \t]/gm,
            ulRgx = options.disableForced4SpacesIndentedSublists ? /^ ?[*+-][ \t]/gm : /^ {0,3}[*+-][ \t]/gm,
            counterRxg = listType === 'ul' ? olRgx : ulRgx,
            result = '';
          if (list.search(counterRxg) !== -1) {
            (function parseCL(txt) {
              var pos = txt.search(counterRxg),
                style = styleStartNumber(list, listType);
              if (pos !== -1) {
                // slice
                result += '\n\n<' + listType + style + '>\n' + processListItems(txt.slice(0, pos), !!trimTrailing) + '</' + listType + '>\n';

                // invert counterType and listType
                listType = listType === 'ul' ? 'ol' : 'ul';
                counterRxg = listType === 'ul' ? olRgx : ulRgx;

                //recurse
                parseCL(txt.slice(pos));
              } else {
                result += '\n\n<' + listType + style + '>\n' + processListItems(txt, !!trimTrailing) + '</' + listType + '>\n';
              }
            })(list);
          } else {
            var style = styleStartNumber(list, listType);
            result = '\n\n<' + listType + style + '>\n' + processListItems(list, !!trimTrailing) + '</' + listType + '>\n';
          }
          return result;
        }

        /** Start of list parsing **/
        text = globals.converter._dispatch('lists.before', text, options, globals);
        // add sentinel to hack around khtml/safari bug:
        // http://bugs.webkit.org/show_bug.cgi?id=11231
        text += '¨0';
        if (globals.gListLevel) {
          text = text.replace(/^(( {0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(¨0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm, function (wholeMatch, list, m2) {
            var listType = m2.search(/[*+-]/g) > -1 ? 'ul' : 'ol';
            return parseConsecutiveLists(list, listType, true);
          });
        } else {
          text = text.replace(/(\n\n|^\n?)(( {0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(¨0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm, function (wholeMatch, m1, list, m3) {
            var listType = m3.search(/[*+-]/g) > -1 ? 'ul' : 'ol';
            return parseConsecutiveLists(list, listType, false);
          });
        }

        // strip sentinel
        text = text.replace(/¨0/, '');
        text = globals.converter._dispatch('lists.after', text, options, globals);
        return text;
      });

      /**
       * Parse metadata at the top of the document
       */
      showdown.subParser('metadata', function (text, options, globals) {

        if (!options.metadata) {
          return text;
        }
        text = globals.converter._dispatch('metadata.before', text, options, globals);
        function parseMetadataContents(content) {
          // raw is raw so it's not changed in any way
          globals.metadata.raw = content;

          // escape chars forbidden in html attributes
          // double quotes
          content = content
          // ampersand first
          .replace(/&/g, '&amp;')
          // double quotes
          .replace(/"/g, '&quot;');
          content = content.replace(/\n {4}/g, ' ');
          content.replace(/^([\S ]+): +([\s\S]+?)$/gm, function (wm, key, value) {
            globals.metadata.parsed[key] = value;
            return '';
          });
        }
        text = text.replace(/^\s*«««+(\S*?)\n([\s\S]+?)\n»»»+\n/, function (wholematch, format, content) {
          parseMetadataContents(content);
          return '¨M';
        });
        text = text.replace(/^\s*---+(\S*?)\n([\s\S]+?)\n---+\n/, function (wholematch, format, content) {
          if (format) {
            globals.metadata.format = format;
          }
          parseMetadataContents(content);
          return '¨M';
        });
        text = text.replace(/¨M/g, '');
        text = globals.converter._dispatch('metadata.after', text, options, globals);
        return text;
      });

      /**
       * Remove one level of line-leading tabs or spaces
       */
      showdown.subParser('outdent', function (text, options, globals) {

        text = globals.converter._dispatch('outdent.before', text, options, globals);

        // attacklab: hack around Konqueror 3.5.4 bug:
        // "----------bug".replace(/^-/g,"") == "bug"
        text = text.replace(/^(\t|[ ]{1,4})/gm, '¨0'); // attacklab: g_tab_width

        // attacklab: clean up hack
        text = text.replace(/¨0/g, '');
        text = globals.converter._dispatch('outdent.after', text, options, globals);
        return text;
      });

      /**
       *
       */
      showdown.subParser('paragraphs', function (text, options, globals) {

        text = globals.converter._dispatch('paragraphs.before', text, options, globals);
        // Strip leading and trailing lines:
        text = text.replace(/^\n+/g, '');
        text = text.replace(/\n+$/g, '');
        var grafs = text.split(/\n{2,}/g),
          grafsOut = [],
          end = grafs.length; // Wrap <p> tags

        for (var i = 0; i < end; i++) {
          var str = grafs[i];
          // if this is an HTML marker, copy it
          if (str.search(/¨(K|G)(\d+)\1/g) >= 0) {
            grafsOut.push(str);

            // test for presence of characters to prevent empty lines being parsed
            // as paragraphs (resulting in undesired extra empty paragraphs)
          } else if (str.search(/\S/) >= 0) {
            str = showdown.subParser('spanGamut')(str, options, globals);
            str = str.replace(/^([ \t]*)/g, '<p>');
            str += '</p>';
            grafsOut.push(str);
          }
        }

        /** Unhashify HTML blocks */
        end = grafsOut.length;
        for (i = 0; i < end; i++) {
          var blockText = '',
            grafsOutIt = grafsOut[i],
            codeFlag = false;
          // if this is a marker for an html block...
          // use RegExp.test instead of string.search because of QML bug
          while (/¨(K|G)(\d+)\1/.test(grafsOutIt)) {
            var delim = RegExp.$1,
              num = RegExp.$2;
            if (delim === 'K') {
              blockText = globals.gHtmlBlocks[num];
            } else {
              // we need to check if ghBlock is a false positive
              if (codeFlag) {
                // use encoded version of all text
                blockText = showdown.subParser('encodeCode')(globals.ghCodeBlocks[num].text, options, globals);
              } else {
                blockText = globals.ghCodeBlocks[num].codeblock;
              }
            }
            blockText = blockText.replace(/\$/g, '$$$$'); // Escape any dollar signs

            grafsOutIt = grafsOutIt.replace(/(\n\n)?¨(K|G)\d+\2(\n\n)?/, blockText);
            // Check if grafsOutIt is a pre->code
            if (/^<pre\b[^>]*>\s*<code\b[^>]*>/.test(grafsOutIt)) {
              codeFlag = true;
            }
          }
          grafsOut[i] = grafsOutIt;
        }
        text = grafsOut.join('\n');
        // Strip leading and trailing lines:
        text = text.replace(/^\n+/g, '');
        text = text.replace(/\n+$/g, '');
        return globals.converter._dispatch('paragraphs.after', text, options, globals);
      });

      /**
       * Run extension
       */
      showdown.subParser('runExtension', function (ext, text, options, globals) {

        if (ext.filter) {
          text = ext.filter(text, globals.converter, options);
        } else if (ext.regex) {
          // TODO remove this when old extension loading mechanism is deprecated
          var re = ext.regex;
          if (!(re instanceof RegExp)) {
            re = new RegExp(re, 'g');
          }
          text = text.replace(re, ext.replace);
        }
        return text;
      });

      /**
       * These are all the transformations that occur *within* block-level
       * tags like paragraphs, headers, and list items.
       */
      showdown.subParser('spanGamut', function (text, options, globals) {

        text = globals.converter._dispatch('spanGamut.before', text, options, globals);
        text = showdown.subParser('codeSpans')(text, options, globals);
        text = showdown.subParser('escapeSpecialCharsWithinTagAttributes')(text, options, globals);
        text = showdown.subParser('encodeBackslashEscapes')(text, options, globals);

        // Process anchor and image tags. Images must come first,
        // because ![foo][f] looks like an anchor.
        text = showdown.subParser('images')(text, options, globals);
        text = showdown.subParser('anchors')(text, options, globals);

        // Make links out of things like `<http://example.com/>`
        // Must come after anchors, because you can use < and >
        // delimiters in inline links like [this](<url>).
        text = showdown.subParser('autoLinks')(text, options, globals);
        text = showdown.subParser('simplifiedAutoLinks')(text, options, globals);
        text = showdown.subParser('emoji')(text, options, globals);
        text = showdown.subParser('underline')(text, options, globals);
        text = showdown.subParser('italicsAndBold')(text, options, globals);
        text = showdown.subParser('strikethrough')(text, options, globals);
        text = showdown.subParser('ellipsis')(text, options, globals);

        // we need to hash HTML tags inside spans
        text = showdown.subParser('hashHTMLSpans')(text, options, globals);

        // now we encode amps and angles
        text = showdown.subParser('encodeAmpsAndAngles')(text, options, globals);

        // Do hard breaks
        if (options.simpleLineBreaks) {
          // GFM style hard breaks
          // only add line breaks if the text does not contain a block (special case for lists)
          if (!/\n\n¨K/.test(text)) {
            text = text.replace(/\n+/g, '<br />\n');
          }
        } else {
          // Vanilla hard breaks
          text = text.replace(/  +\n/g, '<br />\n');
        }
        text = globals.converter._dispatch('spanGamut.after', text, options, globals);
        return text;
      });
      showdown.subParser('strikethrough', function (text, options, globals) {

        function parseInside(txt) {
          if (options.simplifiedAutoLink) {
            txt = showdown.subParser('simplifiedAutoLinks')(txt, options, globals);
          }
          return '<del>' + txt + '</del>';
        }
        if (options.strikethrough) {
          text = globals.converter._dispatch('strikethrough.before', text, options, globals);
          text = text.replace(/(?:~){2}([\s\S]+?)(?:~){2}/g, function (wm, txt) {
            return parseInside(txt);
          });
          text = globals.converter._dispatch('strikethrough.after', text, options, globals);
        }
        return text;
      });

      /**
       * Strips link definitions from text, stores the URLs and titles in
       * hash references.
       * Link defs are in the form: ^[id]: url "optional title"
       */
      showdown.subParser('stripLinkDefinitions', function (text, options, globals) {

        var regex = /^ {0,3}\[([^\]]+)]:[ \t]*\n?[ \t]*<?([^>\s]+)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*\n?[ \t]*(?:(\n*)["|'(](.+?)["|')][ \t]*)?(?:\n+|(?=¨0))/gm,
          base64Regex = /^ {0,3}\[([^\]]+)]:[ \t]*\n?[ \t]*<?(data:.+?\/.+?;base64,[A-Za-z0-9+/=\n]+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*\n?[ \t]*(?:(\n*)["|'(](.+?)["|')][ \t]*)?(?:\n\n|(?=¨0)|(?=\n\[))/gm;

        // attacklab: sentinel workarounds for lack of \A and \Z, safari\khtml bug
        text += '¨0';
        var replaceFunc = function (wholeMatch, linkId, url, width, height, blankLines, title) {
          // if there aren't two instances of linkId it must not be a reference link so back out
          linkId = linkId.toLowerCase();
          if (text.toLowerCase().split(linkId).length - 1 < 2) {
            return wholeMatch;
          }
          if (url.match(/^data:.+?\/.+?;base64,/)) {
            // remove newlines
            globals.gUrls[linkId] = url.replace(/\s/g, '');
          } else {
            globals.gUrls[linkId] = showdown.subParser('encodeAmpsAndAngles')(url, options, globals); // Link IDs are case-insensitive
          }

          if (blankLines) {
            // Oops, found blank lines, so it's not a title.
            // Put back the parenthetical statement we stole.
            return blankLines + title;
          } else {
            if (title) {
              globals.gTitles[linkId] = title.replace(/"|'/g, '&quot;');
            }
            if (options.parseImgDimensions && width && height) {
              globals.gDimensions[linkId] = {
                width: width,
                height: height
              };
            }
          }
          // Completely remove the definition from the text
          return '';
        };

        // first we try to find base64 link references
        text = text.replace(base64Regex, replaceFunc);
        text = text.replace(regex, replaceFunc);

        // attacklab: strip sentinel
        text = text.replace(/¨0/, '');
        return text;
      });
      showdown.subParser('tables', function (text, options, globals) {

        if (!options.tables) {
          return text;
        }
        var tableRgx = /^ {0,3}\|?.+\|.+\n {0,3}\|?[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*:?[ \t]*(?:[-=]){2,}[\s\S]+?(?:\n\n|¨0)/gm,
          //singeColTblRgx = /^ {0,3}\|.+\|\n {0,3}\|[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*\n(?: {0,3}\|.+\|\n)+(?:\n\n|¨0)/gm;
          singeColTblRgx = /^ {0,3}\|.+\|[ \t]*\n {0,3}\|[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*\n( {0,3}\|.+\|[ \t]*\n)*(?:\n|¨0)/gm;
        function parseStyles(sLine) {
          if (/^:[ \t]*--*$/.test(sLine)) {
            return ' style="text-align:left;"';
          } else if (/^--*[ \t]*:[ \t]*$/.test(sLine)) {
            return ' style="text-align:right;"';
          } else if (/^:[ \t]*--*[ \t]*:$/.test(sLine)) {
            return ' style="text-align:center;"';
          } else {
            return '';
          }
        }
        function parseHeaders(header, style) {
          var id = '';
          header = header.trim();
          // support both tablesHeaderId and tableHeaderId due to error in documentation so we don't break backwards compatibility
          if (options.tablesHeaderId || options.tableHeaderId) {
            id = ' id="' + header.replace(/ /g, '_').toLowerCase() + '"';
          }
          header = showdown.subParser('spanGamut')(header, options, globals);
          return '<th' + id + style + '>' + header + '</th>\n';
        }
        function parseCells(cell, style) {
          var subText = showdown.subParser('spanGamut')(cell, options, globals);
          return '<td' + style + '>' + subText + '</td>\n';
        }
        function buildTable(headers, cells) {
          var tb = '<table>\n<thead>\n<tr>\n',
            tblLgn = headers.length;
          for (var i = 0; i < tblLgn; ++i) {
            tb += headers[i];
          }
          tb += '</tr>\n</thead>\n<tbody>\n';
          for (i = 0; i < cells.length; ++i) {
            tb += '<tr>\n';
            for (var ii = 0; ii < tblLgn; ++ii) {
              tb += cells[i][ii];
            }
            tb += '</tr>\n';
          }
          tb += '</tbody>\n</table>\n';
          return tb;
        }
        function parseTable(rawTable) {
          var i,
            tableLines = rawTable.split('\n');
          for (i = 0; i < tableLines.length; ++i) {
            // strip wrong first and last column if wrapped tables are used
            if (/^ {0,3}\|/.test(tableLines[i])) {
              tableLines[i] = tableLines[i].replace(/^ {0,3}\|/, '');
            }
            if (/\|[ \t]*$/.test(tableLines[i])) {
              tableLines[i] = tableLines[i].replace(/\|[ \t]*$/, '');
            }
            // parse code spans first, but we only support one line code spans
            tableLines[i] = showdown.subParser('codeSpans')(tableLines[i], options, globals);
          }
          var rawHeaders = tableLines[0].split('|').map(function (s) {
              return s.trim();
            }),
            rawStyles = tableLines[1].split('|').map(function (s) {
              return s.trim();
            }),
            rawCells = [],
            headers = [],
            styles = [],
            cells = [];
          tableLines.shift();
          tableLines.shift();
          for (i = 0; i < tableLines.length; ++i) {
            if (tableLines[i].trim() === '') {
              continue;
            }
            rawCells.push(tableLines[i].split('|').map(function (s) {
              return s.trim();
            }));
          }
          if (rawHeaders.length < rawStyles.length) {
            return rawTable;
          }
          for (i = 0; i < rawStyles.length; ++i) {
            styles.push(parseStyles(rawStyles[i]));
          }
          for (i = 0; i < rawHeaders.length; ++i) {
            if (showdown.helper.isUndefined(styles[i])) {
              styles[i] = '';
            }
            headers.push(parseHeaders(rawHeaders[i], styles[i]));
          }
          for (i = 0; i < rawCells.length; ++i) {
            var row = [];
            for (var ii = 0; ii < headers.length; ++ii) {
              if (showdown.helper.isUndefined(rawCells[i][ii])) ;
              row.push(parseCells(rawCells[i][ii], styles[ii]));
            }
            cells.push(row);
          }
          return buildTable(headers, cells);
        }
        text = globals.converter._dispatch('tables.before', text, options, globals);

        // find escaped pipe characters
        text = text.replace(/\\(\|)/g, showdown.helper.escapeCharactersCallback);

        // parse multi column tables
        text = text.replace(tableRgx, parseTable);

        // parse one column tables
        text = text.replace(singeColTblRgx, parseTable);
        text = globals.converter._dispatch('tables.after', text, options, globals);
        return text;
      });
      showdown.subParser('underline', function (text, options, globals) {

        if (!options.underline) {
          return text;
        }
        text = globals.converter._dispatch('underline.before', text, options, globals);
        if (options.literalMidWordUnderscores) {
          text = text.replace(/\b___(\S[\s\S]*?)___\b/g, function (wm, txt) {
            return '<u>' + txt + '</u>';
          });
          text = text.replace(/\b__(\S[\s\S]*?)__\b/g, function (wm, txt) {
            return '<u>' + txt + '</u>';
          });
        } else {
          text = text.replace(/___(\S[\s\S]*?)___/g, function (wm, m) {
            return /\S$/.test(m) ? '<u>' + m + '</u>' : wm;
          });
          text = text.replace(/__(\S[\s\S]*?)__/g, function (wm, m) {
            return /\S$/.test(m) ? '<u>' + m + '</u>' : wm;
          });
        }

        // escape remaining underscores to prevent them being parsed by italic and bold
        text = text.replace(/(_)/g, showdown.helper.escapeCharactersCallback);
        text = globals.converter._dispatch('underline.after', text, options, globals);
        return text;
      });

      /**
       * Swap back in all the special characters we've hidden.
       */
      showdown.subParser('unescapeSpecialChars', function (text, options, globals) {

        text = globals.converter._dispatch('unescapeSpecialChars.before', text, options, globals);
        text = text.replace(/¨E(\d+)E/g, function (wholeMatch, m1) {
          var charCodeToReplace = parseInt(m1);
          return String.fromCharCode(charCodeToReplace);
        });
        text = globals.converter._dispatch('unescapeSpecialChars.after', text, options, globals);
        return text;
      });
      showdown.subParser('makeMarkdown.blockquote', function (node, globals) {

        var txt = '';
        if (node.hasChildNodes()) {
          var children = node.childNodes,
            childrenLength = children.length;
          for (var i = 0; i < childrenLength; ++i) {
            var innerTxt = showdown.subParser('makeMarkdown.node')(children[i], globals);
            if (innerTxt === '') {
              continue;
            }
            txt += innerTxt;
          }
        }
        // cleanup
        txt = txt.trim();
        txt = '> ' + txt.split('\n').join('\n> ');
        return txt;
      });
      showdown.subParser('makeMarkdown.codeBlock', function (node, globals) {

        var lang = node.getAttribute('language'),
          num = node.getAttribute('precodenum');
        return '```' + lang + '\n' + globals.preList[num] + '\n```';
      });
      showdown.subParser('makeMarkdown.codeSpan', function (node) {

        return '`' + node.innerHTML + '`';
      });
      showdown.subParser('makeMarkdown.emphasis', function (node, globals) {

        var txt = '';
        if (node.hasChildNodes()) {
          txt += '*';
          var children = node.childNodes,
            childrenLength = children.length;
          for (var i = 0; i < childrenLength; ++i) {
            txt += showdown.subParser('makeMarkdown.node')(children[i], globals);
          }
          txt += '*';
        }
        return txt;
      });
      showdown.subParser('makeMarkdown.header', function (node, globals, headerLevel) {

        var headerMark = new Array(headerLevel + 1).join('#'),
          txt = '';
        if (node.hasChildNodes()) {
          txt = headerMark + ' ';
          var children = node.childNodes,
            childrenLength = children.length;
          for (var i = 0; i < childrenLength; ++i) {
            txt += showdown.subParser('makeMarkdown.node')(children[i], globals);
          }
        }
        return txt;
      });
      showdown.subParser('makeMarkdown.hr', function () {

        return '---';
      });
      showdown.subParser('makeMarkdown.image', function (node) {

        var txt = '';
        if (node.hasAttribute('src')) {
          txt += '![' + node.getAttribute('alt') + '](';
          txt += '<' + node.getAttribute('src') + '>';
          if (node.hasAttribute('width') && node.hasAttribute('height')) {
            txt += ' =' + node.getAttribute('width') + 'x' + node.getAttribute('height');
          }
          if (node.hasAttribute('title')) {
            txt += ' "' + node.getAttribute('title') + '"';
          }
          txt += ')';
        }
        return txt;
      });
      showdown.subParser('makeMarkdown.links', function (node, globals) {

        var txt = '';
        if (node.hasChildNodes() && node.hasAttribute('href')) {
          var children = node.childNodes,
            childrenLength = children.length;
          txt = '[';
          for (var i = 0; i < childrenLength; ++i) {
            txt += showdown.subParser('makeMarkdown.node')(children[i], globals);
          }
          txt += '](';
          txt += '<' + node.getAttribute('href') + '>';
          if (node.hasAttribute('title')) {
            txt += ' "' + node.getAttribute('title') + '"';
          }
          txt += ')';
        }
        return txt;
      });
      showdown.subParser('makeMarkdown.list', function (node, globals, type) {

        var txt = '';
        if (!node.hasChildNodes()) {
          return '';
        }
        var listItems = node.childNodes,
          listItemsLenght = listItems.length,
          listNum = node.getAttribute('start') || 1;
        for (var i = 0; i < listItemsLenght; ++i) {
          if (typeof listItems[i].tagName === 'undefined' || listItems[i].tagName.toLowerCase() !== 'li') {
            continue;
          }

          // define the bullet to use in list
          var bullet = '';
          if (type === 'ol') {
            bullet = listNum.toString() + '. ';
          } else {
            bullet = '- ';
          }

          // parse list item
          txt += bullet + showdown.subParser('makeMarkdown.listItem')(listItems[i], globals);
          ++listNum;
        }

        // add comment at the end to prevent consecutive lists to be parsed as one
        txt += '\n<!-- -->\n';
        return txt.trim();
      });
      showdown.subParser('makeMarkdown.listItem', function (node, globals) {

        var listItemTxt = '';
        var children = node.childNodes,
          childrenLenght = children.length;
        for (var i = 0; i < childrenLenght; ++i) {
          listItemTxt += showdown.subParser('makeMarkdown.node')(children[i], globals);
        }
        // if it's only one liner, we need to add a newline at the end
        if (!/\n$/.test(listItemTxt)) {
          listItemTxt += '\n';
        } else {
          // it's multiparagraph, so we need to indent
          listItemTxt = listItemTxt.split('\n').join('\n    ').replace(/^ {4}$/gm, '').replace(/\n\n+/g, '\n\n');
        }
        return listItemTxt;
      });
      showdown.subParser('makeMarkdown.node', function (node, globals, spansOnly) {

        spansOnly = spansOnly || false;
        var txt = '';

        // edge case of text without wrapper paragraph
        if (node.nodeType === 3) {
          return showdown.subParser('makeMarkdown.txt')(node, globals);
        }

        // HTML comment
        if (node.nodeType === 8) {
          return '<!--' + node.data + '-->\n\n';
        }

        // process only node elements
        if (node.nodeType !== 1) {
          return '';
        }
        var tagName = node.tagName.toLowerCase();
        switch (tagName) {
          //
          // BLOCKS
          //
          case 'h1':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.header')(node, globals, 1) + '\n\n';
            }
            break;
          case 'h2':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.header')(node, globals, 2) + '\n\n';
            }
            break;
          case 'h3':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.header')(node, globals, 3) + '\n\n';
            }
            break;
          case 'h4':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.header')(node, globals, 4) + '\n\n';
            }
            break;
          case 'h5':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.header')(node, globals, 5) + '\n\n';
            }
            break;
          case 'h6':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.header')(node, globals, 6) + '\n\n';
            }
            break;
          case 'p':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.paragraph')(node, globals) + '\n\n';
            }
            break;
          case 'blockquote':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.blockquote')(node, globals) + '\n\n';
            }
            break;
          case 'hr':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.hr')(node, globals) + '\n\n';
            }
            break;
          case 'ol':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.list')(node, globals, 'ol') + '\n\n';
            }
            break;
          case 'ul':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.list')(node, globals, 'ul') + '\n\n';
            }
            break;
          case 'precode':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.codeBlock')(node, globals) + '\n\n';
            }
            break;
          case 'pre':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.pre')(node, globals) + '\n\n';
            }
            break;
          case 'table':
            if (!spansOnly) {
              txt = showdown.subParser('makeMarkdown.table')(node, globals) + '\n\n';
            }
            break;

          //
          // SPANS
          //
          case 'code':
            txt = showdown.subParser('makeMarkdown.codeSpan')(node, globals);
            break;
          case 'em':
          case 'i':
            txt = showdown.subParser('makeMarkdown.emphasis')(node, globals);
            break;
          case 'strong':
          case 'b':
            txt = showdown.subParser('makeMarkdown.strong')(node, globals);
            break;
          case 'del':
            txt = showdown.subParser('makeMarkdown.strikethrough')(node, globals);
            break;
          case 'a':
            txt = showdown.subParser('makeMarkdown.links')(node, globals);
            break;
          case 'img':
            txt = showdown.subParser('makeMarkdown.image')(node, globals);
            break;
          default:
            txt = node.outerHTML + '\n\n';
        }

        // common normalization
        // TODO eventually

        return txt;
      });
      showdown.subParser('makeMarkdown.paragraph', function (node, globals) {

        var txt = '';
        if (node.hasChildNodes()) {
          var children = node.childNodes,
            childrenLength = children.length;
          for (var i = 0; i < childrenLength; ++i) {
            txt += showdown.subParser('makeMarkdown.node')(children[i], globals);
          }
        }

        // some text normalization
        txt = txt.trim();
        return txt;
      });
      showdown.subParser('makeMarkdown.pre', function (node, globals) {

        var num = node.getAttribute('prenum');
        return '<pre>' + globals.preList[num] + '</pre>';
      });
      showdown.subParser('makeMarkdown.strikethrough', function (node, globals) {

        var txt = '';
        if (node.hasChildNodes()) {
          txt += '~~';
          var children = node.childNodes,
            childrenLength = children.length;
          for (var i = 0; i < childrenLength; ++i) {
            txt += showdown.subParser('makeMarkdown.node')(children[i], globals);
          }
          txt += '~~';
        }
        return txt;
      });
      showdown.subParser('makeMarkdown.strong', function (node, globals) {

        var txt = '';
        if (node.hasChildNodes()) {
          txt += '**';
          var children = node.childNodes,
            childrenLength = children.length;
          for (var i = 0; i < childrenLength; ++i) {
            txt += showdown.subParser('makeMarkdown.node')(children[i], globals);
          }
          txt += '**';
        }
        return txt;
      });
      showdown.subParser('makeMarkdown.table', function (node, globals) {

        var txt = '',
          tableArray = [[], []],
          headings = node.querySelectorAll('thead>tr>th'),
          rows = node.querySelectorAll('tbody>tr'),
          i,
          ii;
        for (i = 0; i < headings.length; ++i) {
          var headContent = showdown.subParser('makeMarkdown.tableCell')(headings[i], globals),
            allign = '---';
          if (headings[i].hasAttribute('style')) {
            var style = headings[i].getAttribute('style').toLowerCase().replace(/\s/g, '');
            switch (style) {
              case 'text-align:left;':
                allign = ':---';
                break;
              case 'text-align:right;':
                allign = '---:';
                break;
              case 'text-align:center;':
                allign = ':---:';
                break;
            }
          }
          tableArray[0][i] = headContent.trim();
          tableArray[1][i] = allign;
        }
        for (i = 0; i < rows.length; ++i) {
          var r = tableArray.push([]) - 1,
            cols = rows[i].getElementsByTagName('td');
          for (ii = 0; ii < headings.length; ++ii) {
            var cellContent = ' ';
            if (typeof cols[ii] !== 'undefined') {
              cellContent = showdown.subParser('makeMarkdown.tableCell')(cols[ii], globals);
            }
            tableArray[r].push(cellContent);
          }
        }
        var cellSpacesCount = 3;
        for (i = 0; i < tableArray.length; ++i) {
          for (ii = 0; ii < tableArray[i].length; ++ii) {
            var strLen = tableArray[i][ii].length;
            if (strLen > cellSpacesCount) {
              cellSpacesCount = strLen;
            }
          }
        }
        for (i = 0; i < tableArray.length; ++i) {
          for (ii = 0; ii < tableArray[i].length; ++ii) {
            if (i === 1) {
              if (tableArray[i][ii].slice(-1) === ':') {
                tableArray[i][ii] = showdown.helper.padEnd(tableArray[i][ii].slice(-1), cellSpacesCount - 1, '-') + ':';
              } else {
                tableArray[i][ii] = showdown.helper.padEnd(tableArray[i][ii], cellSpacesCount, '-');
              }
            } else {
              tableArray[i][ii] = showdown.helper.padEnd(tableArray[i][ii], cellSpacesCount);
            }
          }
          txt += '| ' + tableArray[i].join(' | ') + ' |\n';
        }
        return txt.trim();
      });
      showdown.subParser('makeMarkdown.tableCell', function (node, globals) {

        var txt = '';
        if (!node.hasChildNodes()) {
          return '';
        }
        var children = node.childNodes,
          childrenLength = children.length;
        for (var i = 0; i < childrenLength; ++i) {
          txt += showdown.subParser('makeMarkdown.node')(children[i], globals, true);
        }
        return txt.trim();
      });
      showdown.subParser('makeMarkdown.txt', function (node) {

        var txt = node.nodeValue;

        // multiple spaces are collapsed
        txt = txt.replace(/ +/g, ' ');

        // replace the custom ¨NBSP; with a space
        txt = txt.replace(/¨NBSP;/g, ' ');

        // ", <, > and & should replace escaped html entities
        txt = showdown.helper.unescapeHTMLEntities(txt);

        // escape markdown magic characters
        // emphasis, strong and strikethrough - can appear everywhere
        // we also escape pipe (|) because of tables
        // and escape ` because of code blocks and spans
        txt = txt.replace(/([*_~|`])/g, '\\$1');

        // escape > because of blockquotes
        txt = txt.replace(/^(\s*)>/g, '\\$1>');

        // hash character, only troublesome at the beginning of a line because of headers
        txt = txt.replace(/^#/gm, '\\#');

        // horizontal rules
        txt = txt.replace(/^(\s*)([-=]{3,})(\s*)$/, '$1\\$2$3');

        // dot, because of ordered lists, only troublesome at the beginning of a line when preceded by an integer
        txt = txt.replace(/^( {0,3}\d+)\./gm, '$1\\.');

        // +, * and -, at the beginning of a line becomes a list, so we need to escape them also (asterisk was already escaped)
        txt = txt.replace(/^( {0,3})([+-])/gm, '$1\\$2');

        // images and links, ] followed by ( is problematic, so we escape it
        txt = txt.replace(/]([\s]*)\(/g, '\\]$1\\(');

        // reference URIs must also be escaped
        txt = txt.replace(/^ {0,3}\[([\S \t]*?)]:/gm, '\\[$1]:');
        return txt;
      });
      var root = this;

      // AMD Loader
      if (module.exports) {
        module.exports = showdown;

        // Regular Browser loader
      } else {
        root.showdown = showdown;
      }
    }).call(commonjsGlobal);
  })(showdown);
  var showdownExports = showdown.exports;

  var hljs = common;
  hljs.configure({
    ignoreUnescapedHTML: true
  });
  hljs.safeMode();
  var converter = new showdownExports.Converter({
    requireSpaceBeforeHeadingText: true,
    tables: true
  });

  /**
   * Escapes HTML special characters in a string
   * Source: https://stackoverflow.com/questions/1787322
   *
   * @param {string} text Raw text
   * @returns string Escaped HTML
   */
  function escapeHtml(text) {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) {
      return map[m];
    });
  }
  function convertMarkdownToHtml(text) {
    // add ending code block tags when missing
    var code_block_count = (text.match(/```/g) || []).length;
    if (code_block_count % 2 !== 0) {
      text += "\n```";
    }

    // HTML-escape parts of text that are not inside ticks.
    // This prevents <?php from turning into a comment tag
    var escaped_parts = [];
    var code_parts = text.split("`");
    for (var i = 0; i < code_parts.length; i++) {
      if (i % 2 === 0) {
        escaped_parts.push(escapeHtml(code_parts[i]));
      } else {
        escaped_parts.push(code_parts[i]);
      }
    }
    var escaped_message = escaped_parts.join("`");

    // Convert Markdown to HTML
    var formatted_message = "";
    var code_blocks = escaped_message.split("```");
    for (var _i = 0; _i < code_blocks.length; _i++) {
      if (_i % 2 === 0) {
        // add two spaces in the end of every line
        // for non-codeblocks so that one-per-line lists
        // without markdown can be generated
        formatted_message += converter.makeHtml(code_blocks[_i].trim().replace(/\n/g, "  \n"));
      } else {
        // convert Markdown code blocks to HTML
        formatted_message += converter.makeHtml("```" + code_blocks[_i] + "```");
      }
    }
    return formatted_message;
  }
  function markdownToHtml(text) {
    var html = convertMarkdownToHtml(text);
    var el = document.createElement('div');
    el.innerHTML = html;
    el.querySelectorAll('pre code').forEach(function (el) {
      var text = el.innerText.trim();
      var h = hljs.highlightAuto(text);
      el.innerHTML = h.value;
      var lang = document.createElement('span');
      lang.classList.add('lang');
      lang.innerText = h.language;
      el.closest('pre').append(lang);
    });
    el.querySelectorAll('pre').forEach(function (el) {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute('fill', 'none');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.innerHTML = '<rect cx="56" width="100%" height="100%" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4" rx="8" ry="8" />';
      el.appendChild(svg);
    });
    return el.innerHTML;
  }

  var __awaiter$2 = window && window.__awaiter || function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function (resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  /** Decode an array buffer into an audio buffer */
  function decode(audioData, sampleRate) {
    return __awaiter$2(this, void 0, void 0, function* () {
      const audioCtx = new AudioContext({
        sampleRate
      });
      const decode = audioCtx.decodeAudioData(audioData);
      return decode.finally(() => audioCtx.close());
    });
  }
  /** Normalize peaks to -1..1 */
  function normalize(channelData) {
    const firstChannel = channelData[0];
    if (firstChannel.some(n => n > 1 || n < -1)) {
      const length = firstChannel.length;
      let max = 0;
      for (let i = 0; i < length; i++) {
        const absN = Math.abs(firstChannel[i]);
        if (absN > max) max = absN;
      }
      for (const channel of channelData) {
        for (let i = 0; i < length; i++) {
          channel[i] /= max;
        }
      }
    }
    return channelData;
  }
  /** Create an audio buffer from pre-decoded audio data */
  function createBuffer(channelData, duration) {
    // If a single array of numbers is passed, make it an array of arrays
    if (typeof channelData[0] === 'number') channelData = [channelData];
    // Normalize to -1..1
    normalize(channelData);
    return {
      duration,
      length: channelData[0].length,
      sampleRate: channelData[0].length / duration,
      numberOfChannels: channelData.length,
      getChannelData: i => channelData === null || channelData === void 0 ? void 0 : channelData[i],
      copyFromChannel: AudioBuffer.prototype.copyFromChannel,
      copyToChannel: AudioBuffer.prototype.copyToChannel
    };
  }
  const Decoder = {
    decode,
    createBuffer
  };

  var __awaiter$1 = window && window.__awaiter || function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function (resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  function fetchBlob(url, progressCallback, requestInit) {
    var _a, _b;
    return __awaiter$1(this, void 0, void 0, function* () {
      // Fetch the resource
      const response = yield fetch(url, requestInit);
      // Read the data to track progress
      {
        const reader = (_a = response.clone().body) === null || _a === void 0 ? void 0 : _a.getReader();
        const contentLength = Number((_b = response.headers) === null || _b === void 0 ? void 0 : _b.get('Content-Length'));
        let receivedLength = 0;
        // Process the data
        const processChunk = (done, value) => __awaiter$1(this, void 0, void 0, function* () {
          if (done) return;
          // Add to the received length
          receivedLength += (value === null || value === void 0 ? void 0 : value.length) || 0;
          const percentage = Math.round(receivedLength / contentLength * 100);
          progressCallback(percentage);
          // Continue reading data
          return reader === null || reader === void 0 ? void 0 : reader.read().then(({
            done,
            value
          }) => processChunk(done, value));
        });
        reader === null || reader === void 0 ? void 0 : reader.read().then(({
          done,
          value
        }) => processChunk(done, value));
      }
      return response.blob();
    });
  }
  const Fetcher = {
    fetchBlob
  };

  /** A simple event emitter that can be used to listen to and emit events. */
  class EventEmitter {
    constructor() {
      this.listeners = {};
    }
    /** Subscribe to an event. Returns an unsubscribe function. */
    on(eventName, listener) {
      if (!this.listeners[eventName]) {
        this.listeners[eventName] = new Set();
      }
      this.listeners[eventName].add(listener);
      return () => this.un(eventName, listener);
    }
    /** Subscribe to an event only once */
    once(eventName, listener) {
      // The actual subscription
      const unsubscribe = this.on(eventName, listener);
      // Another subscription that will unsubscribe the actual subscription and itself after the first event
      const unsubscribeOnce = this.on(eventName, () => {
        unsubscribe();
        unsubscribeOnce();
      });
      return unsubscribe;
    }
    /** Unsubscribe from an event */
    un(eventName, listener) {
      if (this.listeners[eventName]) {
        if (listener) {
          this.listeners[eventName].delete(listener);
        } else {
          delete this.listeners[eventName];
        }
      }
    }
    /** Clear all events */
    unAll() {
      this.listeners = {};
    }
    /** Emit an event */
    emit(eventName, ...args) {
      if (this.listeners[eventName]) {
        this.listeners[eventName].forEach(listener => listener(...args));
      }
    }
  }

  class Player extends EventEmitter {
    constructor(options) {
      super();
      if (options.media) {
        this.media = options.media;
      } else {
        this.media = document.createElement('audio');
      }
      // Controls
      if (options.mediaControls) {
        this.media.controls = true;
      }
      // Autoplay
      if (options.autoplay) {
        this.media.autoplay = true;
      }
      // Speed
      if (options.playbackRate != null) {
        this.onceMediaEvent('canplay', () => {
          if (options.playbackRate != null) {
            this.media.playbackRate = options.playbackRate;
          }
        });
      }
    }
    onMediaEvent(event, callback, options) {
      this.media.addEventListener(event, callback, options);
      return () => this.media.removeEventListener(event, callback);
    }
    onceMediaEvent(event, callback) {
      return this.onMediaEvent(event, callback, {
        once: true
      });
    }
    getSrc() {
      return this.media.currentSrc || this.media.src || '';
    }
    revokeSrc() {
      const src = this.getSrc();
      if (src.startsWith('blob:')) {
        URL.revokeObjectURL(src);
      }
    }
    setSrc(url, blob) {
      const src = this.getSrc();
      if (src === url) return;
      this.revokeSrc();
      const newSrc = blob instanceof Blob ? URL.createObjectURL(blob) : url;
      this.media.src = newSrc;
      this.media.load();
    }
    destroy() {
      this.media.pause();
      this.revokeSrc();
      this.media.src = '';
      // Load resets the media element to its initial state
      this.media.load();
    }
    /** Start playing the audio */
    play() {
      return this.media.play();
    }
    /** Pause the audio */
    pause() {
      this.media.pause();
    }
    /** Check if the audio is playing */
    isPlaying() {
      return this.media.currentTime > 0 && !this.media.paused && !this.media.ended;
    }
    /** Jumpt to a specific time in the audio (in seconds) */
    setTime(time) {
      this.media.currentTime = time;
    }
    /** Get the duration of the audio in seconds */
    getDuration() {
      return this.media.duration;
    }
    /** Get the current audio position in seconds */
    getCurrentTime() {
      return this.media.currentTime;
    }
    /** Get the audio volume */
    getVolume() {
      return this.media.volume;
    }
    /** Set the audio volume */
    setVolume(volume) {
      this.media.volume = volume;
    }
    /** Get the audio muted state */
    getMuted() {
      return this.media.muted;
    }
    /** Mute or unmute the audio */
    setMuted(muted) {
      this.media.muted = muted;
    }
    /** Get the playback speed */
    getPlaybackRate() {
      return this.media.playbackRate;
    }
    /** Set the playback speed, pass an optional false to NOT preserve the pitch */
    setPlaybackRate(rate, preservePitch) {
      // preservePitch is true by default in most browsers
      if (preservePitch != null) {
        this.media.preservesPitch = preservePitch;
      }
      this.media.playbackRate = rate;
    }
    /** Get the HTML media element */
    getMediaElement() {
      return this.media;
    }
    /** Set a sink id to change the audio output device */
    setSinkId(sinkId) {
      // See https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
      const media = this.media;
      return media.setSinkId(sinkId);
    }
  }

  function makeDraggable(element, onDrag, onStart, onEnd, threshold = 5) {
    let unsub = () => {
      return;
    };
    if (!element) return unsub;
    const down = e => {
      // Ignore the right mouse button
      if (e.button === 2) return;
      e.preventDefault();
      e.stopPropagation();
      let startX = e.clientX;
      let startY = e.clientY;
      let isDragging = false;
      const move = e => {
        e.preventDefault();
        e.stopPropagation();
        const x = e.clientX;
        const y = e.clientY;
        if (isDragging || Math.abs(x - startX) >= threshold || Math.abs(y - startY) >= threshold) {
          const {
            left,
            top
          } = element.getBoundingClientRect();
          if (!isDragging) {
            isDragging = true;
            onStart === null || onStart === void 0 ? void 0 : onStart(startX - left, startY - top);
          }
          onDrag(x - startX, y - startY, x - left, y - top);
          startX = x;
          startY = y;
        }
      };
      const click = e => {
        if (isDragging) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      const up = () => {
        if (isDragging) {
          onEnd === null || onEnd === void 0 ? void 0 : onEnd();
        }
        unsub();
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointerleave', up);
      document.addEventListener('click', click, true);
      unsub = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointerleave', up);
        setTimeout(() => {
          document.removeEventListener('click', click, true);
        }, 10);
      };
    };
    element.addEventListener('pointerdown', down);
    return () => {
      unsub();
      element.removeEventListener('pointerdown', down);
    };
  }

  class Renderer extends EventEmitter {
    constructor(options, audioElement) {
      super();
      this.timeouts = [];
      this.isScrolling = false;
      this.audioData = null;
      this.resizeObserver = null;
      this.isDragging = false;
      this.options = options;
      let parent;
      if (typeof options.container === 'string') {
        parent = document.querySelector(options.container);
      } else if (options.container instanceof HTMLElement) {
        parent = options.container;
      }
      if (!parent) {
        throw new Error('Container not found');
      }
      this.parent = parent;
      const [div, shadow] = this.initHtml();
      parent.appendChild(div);
      this.container = div;
      this.scrollContainer = shadow.querySelector('.scroll');
      this.wrapper = shadow.querySelector('.wrapper');
      this.canvasWrapper = shadow.querySelector('.canvases');
      this.progressWrapper = shadow.querySelector('.progress');
      this.cursor = shadow.querySelector('.cursor');
      if (audioElement) {
        shadow.appendChild(audioElement);
      }
      this.initEvents();
    }
    initEvents() {
      // Add a click listener
      this.wrapper.addEventListener('click', e => {
        const rect = this.wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const relativeX = x / rect.width;
        this.emit('click', relativeX);
      });
      // Drag
      if (this.options.dragToSeek) {
        this.initDrag();
      }
      // Add a scroll listener
      this.scrollContainer.addEventListener('scroll', () => {
        const {
          scrollLeft,
          scrollWidth,
          clientWidth
        } = this.scrollContainer;
        const startX = scrollLeft / scrollWidth;
        const endX = (scrollLeft + clientWidth) / scrollWidth;
        this.emit('scroll', startX, endX);
      });
      // Re-render the waveform on container resize
      const delay = this.createDelay(100);
      this.resizeObserver = new ResizeObserver(() => {
        delay(() => this.reRender());
      });
      this.resizeObserver.observe(this.scrollContainer);
    }
    initDrag() {
      makeDraggable(this.wrapper,
      // On drag
      (_, __, x) => {
        this.emit('drag', Math.max(0, Math.min(1, x / this.wrapper.getBoundingClientRect().width)));
      },
      // On start drag
      () => this.isDragging = true,
      // On end drag
      () => this.isDragging = false);
    }
    getHeight() {
      const defaultHeight = 128;
      if (this.options.height == null) return defaultHeight;
      if (!isNaN(Number(this.options.height))) return Number(this.options.height);
      if (this.options.height === 'auto') return this.parent.clientHeight || defaultHeight;
      return defaultHeight;
    }
    initHtml() {
      const div = document.createElement('div');
      const shadow = div.attachShadow({
        mode: 'open'
      });
      shadow.innerHTML = `
      <style>
        :host {
          user-select: none;
        }
        :host audio {
          display: block;
          width: 100%;
        }
        :host .scroll {
          overflow-x: auto;
          overflow-y: hidden;
          width: 100%;
          position: relative;
          touch-action: none;
        }
        :host .noScrollbar {
          scrollbar-color: transparent;
          scrollbar-width: none;
        }
        :host .noScrollbar::-webkit-scrollbar {
          display: none;
          -webkit-appearance: none;
        }
        :host .wrapper {
          position: relative;
          overflow: visible;
          z-index: 2;
        }
        :host .canvases {
          min-height: ${this.getHeight()}px;
        }
        :host .canvases > div {
          position: relative;
        }
        :host canvas {
          display: block;
          position: absolute;
          top: 0;
          image-rendering: pixelated;
        }
        :host .progress {
          pointer-events: none;
          position: absolute;
          z-index: 2;
          top: 0;
          left: 0;
          width: 0;
          height: 100%;
          overflow: hidden;
        }
        :host .progress > div {
          position: relative;
        }
        :host .cursor {
          pointer-events: none;
          position: absolute;
          z-index: 5;
          top: 0;
          left: 0;
          height: 100%;
          border-radius: 2px;
        }
      </style>

      <div class="scroll" part="scroll">
        <div class="wrapper" part="wrapper">
          <div class="canvases"></div>
          <div class="progress" part="progress"></div>
          <div class="cursor" part="cursor"></div>
        </div>
      </div>
    `;
      return [div, shadow];
    }
    setOptions(options) {
      this.options = options;
      // Re-render the waveform
      this.reRender();
    }
    getWrapper() {
      return this.wrapper;
    }
    getScroll() {
      return this.scrollContainer.scrollLeft;
    }
    destroy() {
      var _a;
      this.container.remove();
      (_a = this.resizeObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
    }
    createDelay(delayMs = 10) {
      const context = {};
      this.timeouts.push(context);
      return callback => {
        context.timeout && clearTimeout(context.timeout);
        context.timeout = setTimeout(callback, delayMs);
      };
    }
    // Convert array of color values to linear gradient
    convertColorValues(color) {
      if (!Array.isArray(color)) return color || '';
      if (color.length < 2) return color[0] || '';
      const canvasElement = document.createElement('canvas');
      const ctx = canvasElement.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasElement.height);
      const colorStopPercentage = 1 / (color.length - 1);
      color.forEach((color, index) => {
        const offset = index * colorStopPercentage;
        gradient.addColorStop(offset, color);
      });
      return gradient;
    }
    renderBarWaveform(channelData, options, ctx, vScale) {
      const topChannel = channelData[0];
      const bottomChannel = channelData[1] || channelData[0];
      const length = topChannel.length;
      const {
        width,
        height
      } = ctx.canvas;
      const halfHeight = height / 2;
      const pixelRatio = window.devicePixelRatio || 1;
      const barWidth = options.barWidth ? options.barWidth * pixelRatio : 1;
      const barGap = options.barGap ? options.barGap * pixelRatio : options.barWidth ? barWidth / 2 : 0;
      const barRadius = options.barRadius || 0;
      const barIndexScale = width / (barWidth + barGap) / length;
      const rectFn = barRadius && 'roundRect' in ctx ? 'roundRect' : 'rect';
      ctx.beginPath();
      let prevX = 0;
      let maxTop = 0;
      let maxBottom = 0;
      for (let i = 0; i <= length; i++) {
        const x = Math.round(i * barIndexScale);
        if (x > prevX) {
          const topBarHeight = Math.round(maxTop * halfHeight * vScale);
          const bottomBarHeight = Math.round(maxBottom * halfHeight * vScale);
          const barHeight = topBarHeight + bottomBarHeight || 1;
          // Vertical alignment
          let y = halfHeight - topBarHeight;
          if (options.barAlign === 'top') {
            y = 0;
          } else if (options.barAlign === 'bottom') {
            y = height - barHeight;
          }
          ctx[rectFn](prevX * (barWidth + barGap), y, barWidth, barHeight, barRadius);
          prevX = x;
          maxTop = 0;
          maxBottom = 0;
        }
        const magnitudeTop = Math.abs(topChannel[i] || 0);
        const magnitudeBottom = Math.abs(bottomChannel[i] || 0);
        if (magnitudeTop > maxTop) maxTop = magnitudeTop;
        if (magnitudeBottom > maxBottom) maxBottom = magnitudeBottom;
      }
      ctx.fill();
      ctx.closePath();
    }
    renderLineWaveform(channelData, _options, ctx, vScale) {
      const drawChannel = index => {
        const channel = channelData[index] || channelData[0];
        const length = channel.length;
        const {
          height
        } = ctx.canvas;
        const halfHeight = height / 2;
        const hScale = ctx.canvas.width / length;
        ctx.moveTo(0, halfHeight);
        let prevX = 0;
        let max = 0;
        for (let i = 0; i <= length; i++) {
          const x = Math.round(i * hScale);
          if (x > prevX) {
            const h = Math.round(max * halfHeight * vScale) || 1;
            const y = halfHeight + h * (index === 0 ? -1 : 1);
            ctx.lineTo(prevX, y);
            prevX = x;
            max = 0;
          }
          const value = Math.abs(channel[i] || 0);
          if (value > max) max = value;
        }
        ctx.lineTo(prevX, halfHeight);
      };
      ctx.beginPath();
      drawChannel(0);
      drawChannel(1);
      ctx.fill();
      ctx.closePath();
    }
    renderWaveform(channelData, options, ctx) {
      ctx.fillStyle = this.convertColorValues(options.waveColor);
      // Custom rendering function
      if (options.renderFunction) {
        options.renderFunction(channelData, ctx);
        return;
      }
      // Vertical scaling
      let vScale = options.barHeight || 1;
      if (options.normalize) {
        const max = Array.from(channelData[0]).reduce((max, value) => Math.max(max, Math.abs(value)), 0);
        vScale = max ? 1 / max : 1;
      }
      // Render waveform as bars
      if (options.barWidth || options.barGap || options.barAlign) {
        this.renderBarWaveform(channelData, options, ctx, vScale);
        return;
      }
      // Render waveform as a polyline
      this.renderLineWaveform(channelData, options, ctx, vScale);
    }
    renderSingleCanvas(channelData, options, width, height, start, end, canvasContainer, progressContainer) {
      const pixelRatio = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      const length = channelData[0].length;
      canvas.width = Math.round(width * (end - start) / length);
      canvas.height = height * pixelRatio;
      canvas.style.width = `${Math.floor(canvas.width / pixelRatio)}px`;
      canvas.style.height = `${height}px`;
      canvas.style.left = `${Math.floor(start * width / pixelRatio / length)}px`;
      canvasContainer.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      this.renderWaveform(channelData.map(channel => channel.slice(start, end)), options, ctx);
      // Draw a progress canvas
      const progressCanvas = canvas.cloneNode();
      progressContainer.appendChild(progressCanvas);
      const progressCtx = progressCanvas.getContext('2d');
      if (canvas.width > 0 && canvas.height > 0) {
        progressCtx.drawImage(canvas, 0, 0);
      }
      // Set the composition method to draw only where the waveform is drawn
      progressCtx.globalCompositeOperation = 'source-in';
      progressCtx.fillStyle = this.convertColorValues(options.progressColor);
      // This rectangle acts as a mask thanks to the composition method
      progressCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
    renderChannel(channelData, options, width) {
      // A container for canvases
      const canvasContainer = document.createElement('div');
      const height = this.getHeight();
      canvasContainer.style.height = `${height}px`;
      this.canvasWrapper.style.minHeight = `${height}px`;
      this.canvasWrapper.appendChild(canvasContainer);
      // A container for progress canvases
      const progressContainer = canvasContainer.cloneNode();
      this.progressWrapper.appendChild(progressContainer);
      // Determine the currently visible part of the waveform
      const {
        scrollLeft,
        scrollWidth,
        clientWidth
      } = this.scrollContainer;
      const len = channelData[0].length;
      const scale = len / scrollWidth;
      let viewportWidth = Math.min(Renderer.MAX_CANVAS_WIDTH, clientWidth);
      // Adjust width to avoid gaps between canvases when using bars
      if (options.barWidth || options.barGap) {
        const barWidth = options.barWidth || 0.5;
        const barGap = options.barGap || barWidth / 2;
        const totalBarWidth = barWidth + barGap;
        if (viewportWidth % totalBarWidth !== 0) {
          viewportWidth = Math.floor(viewportWidth / totalBarWidth) * totalBarWidth;
        }
      }
      const start = Math.floor(Math.abs(scrollLeft) * scale);
      const end = Math.floor(start + viewportWidth * scale);
      const viewportLen = end - start;
      // Draw a portion of the waveform from start peak to end peak
      const draw = (start, end) => {
        this.renderSingleCanvas(channelData, options, width, height, Math.max(0, start), Math.min(end, len), canvasContainer, progressContainer);
      };
      // Draw the waveform in viewport chunks, each with a delay
      const headDelay = this.createDelay();
      const tailDelay = this.createDelay();
      const renderHead = (fromIndex, toIndex) => {
        draw(fromIndex, toIndex);
        if (fromIndex > 0) {
          headDelay(() => {
            renderHead(fromIndex - viewportLen, toIndex - viewportLen);
          });
        }
      };
      const renderTail = (fromIndex, toIndex) => {
        draw(fromIndex, toIndex);
        if (toIndex < len) {
          tailDelay(() => {
            renderTail(fromIndex + viewportLen, toIndex + viewportLen);
          });
        }
      };
      renderHead(start, end);
      if (end < len) {
        renderTail(end, end + viewportLen);
      }
    }
    render(audioData) {
      // Clear previous timeouts
      this.timeouts.forEach(context => context.timeout && clearTimeout(context.timeout));
      this.timeouts = [];
      // Clear the canvases
      this.canvasWrapper.innerHTML = '';
      this.progressWrapper.innerHTML = '';
      this.wrapper.style.width = '';
      // Determine the width of the waveform
      const pixelRatio = window.devicePixelRatio || 1;
      const parentWidth = this.scrollContainer.clientWidth;
      const scrollWidth = Math.ceil(audioData.duration * (this.options.minPxPerSec || 0));
      // Whether the container should scroll
      this.isScrolling = scrollWidth > parentWidth;
      const useParentWidth = this.options.fillParent && !this.isScrolling;
      // Width of the waveform in pixels
      const width = (useParentWidth ? parentWidth : scrollWidth) * pixelRatio;
      // Set the width of the wrapper
      this.wrapper.style.width = useParentWidth ? '100%' : `${scrollWidth}px`;
      // Set additional styles
      this.scrollContainer.style.overflowX = this.isScrolling ? 'auto' : 'hidden';
      this.scrollContainer.classList.toggle('noScrollbar', !!this.options.hideScrollbar);
      this.cursor.style.backgroundColor = `${this.options.cursorColor || this.options.progressColor}`;
      this.cursor.style.width = `${this.options.cursorWidth}px`;
      // Render the waveform
      if (this.options.splitChannels) {
        // Render a waveform for each channel
        for (let i = 0; i < audioData.numberOfChannels; i++) {
          const options = Object.assign(Object.assign({}, this.options), this.options.splitChannels[i]);
          this.renderChannel([audioData.getChannelData(i)], options, width);
        }
      } else {
        // Render a single waveform for the first two channels (left and right)
        const channels = [audioData.getChannelData(0)];
        if (audioData.numberOfChannels > 1) channels.push(audioData.getChannelData(1));
        this.renderChannel(channels, this.options, width);
      }
      this.audioData = audioData;
      this.emit('render');
    }
    reRender() {
      // Return if the waveform has not been rendered yet
      if (!this.audioData) return;
      // Remember the current cursor position
      const oldCursorPosition = this.progressWrapper.clientWidth;
      // Set the new zoom level and re-render the waveform
      this.render(this.audioData);
      // Adjust the scroll position so that the cursor stays in the same place
      const newCursortPosition = this.progressWrapper.clientWidth;
      this.scrollContainer.scrollLeft += newCursortPosition - oldCursorPosition;
    }
    zoom(minPxPerSec) {
      this.options.minPxPerSec = minPxPerSec;
      this.reRender();
    }
    scrollIntoView(progress, isPlaying = false) {
      const {
        clientWidth,
        scrollLeft,
        scrollWidth
      } = this.scrollContainer;
      const progressWidth = scrollWidth * progress;
      const center = clientWidth / 2;
      const minScroll = isPlaying && this.options.autoCenter && !this.isDragging ? center : clientWidth;
      if (progressWidth > scrollLeft + minScroll || progressWidth < scrollLeft) {
        // Scroll to the center
        if (this.options.autoCenter && !this.isDragging) {
          // If the cursor is in viewport but not centered, scroll to the center slowly
          const minDiff = center / 20;
          if (progressWidth - (scrollLeft + center) >= minDiff && progressWidth < scrollLeft + clientWidth) {
            this.scrollContainer.scrollLeft += minDiff;
          } else {
            // Otherwise, scroll to the center immediately
            this.scrollContainer.scrollLeft = progressWidth - center;
          }
        } else if (this.isDragging) {
          // Scroll just a little bit to allow for some space between the cursor and the edge
          const gap = 10;
          this.scrollContainer.scrollLeft = progressWidth < scrollLeft ? progressWidth - gap : progressWidth - clientWidth + gap;
        } else {
          // Scroll to the beginning
          this.scrollContainer.scrollLeft = progressWidth;
        }
      }
      // Emit the scroll event
      {
        const {
          scrollLeft
        } = this.scrollContainer;
        const startX = scrollLeft / scrollWidth;
        const endX = (scrollLeft + clientWidth) / scrollWidth;
        this.emit('scroll', startX, endX);
      }
    }
    renderProgress(progress, isPlaying) {
      if (isNaN(progress)) return;
      this.progressWrapper.style.width = `${progress * 100}%`;
      this.cursor.style.left = `${progress * 100}%`;
      this.cursor.style.marginLeft = Math.round(progress * 100) === 100 ? `-${this.options.cursorWidth}px` : '';
      if (this.isScrolling && this.options.autoScroll) {
        this.scrollIntoView(progress, isPlaying);
      }
    }
  }
  Renderer.MAX_CANVAS_WIDTH = 4000;

  class Timer extends EventEmitter {
    constructor() {
      super(...arguments);
      this.unsubscribe = () => undefined;
    }
    start() {
      this.unsubscribe = this.on('tick', () => {
        requestAnimationFrame(() => {
          this.emit('tick');
        });
      });
      this.emit('tick');
    }
    stop() {
      this.unsubscribe();
    }
    destroy() {
      this.unsubscribe();
    }
  }

  var __awaiter = window && window.__awaiter || function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function (resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  const defaultOptions = {
    waveColor: '#999',
    progressColor: '#555',
    cursorWidth: 1,
    minPxPerSec: 0,
    fillParent: true,
    interact: true,
    dragToSeek: false,
    autoScroll: true,
    autoCenter: true,
    sampleRate: 8000
  };
  class WaveSurfer extends Player {
    /** Create a new WaveSurfer instance */
    static create(options) {
      return new WaveSurfer(options);
    }
    /** Create a new WaveSurfer instance */
    constructor(options) {
      var _a, _b;
      super({
        media: options.media,
        mediaControls: options.mediaControls,
        autoplay: options.autoplay,
        playbackRate: options.audioRate
      });
      this.plugins = [];
      this.decodedData = null;
      this.subscriptions = [];
      this.options = Object.assign({}, defaultOptions, options);
      this.timer = new Timer();
      const audioElement = !options.media ? this.getMediaElement() : undefined;
      this.renderer = new Renderer(this.options, audioElement);
      this.initPlayerEvents();
      this.initRendererEvents();
      this.initTimerEvents();
      this.initPlugins();
      // Load audio if URL is passed or an external media with an src
      const url = this.options.url || ((_a = this.options.media) === null || _a === void 0 ? void 0 : _a.currentSrc) || ((_b = this.options.media) === null || _b === void 0 ? void 0 : _b.src);
      if (url) {
        this.load(url, this.options.peaks, this.options.duration);
      }
    }
    initTimerEvents() {
      // The timer fires every 16ms for a smooth progress animation
      this.subscriptions.push(this.timer.on('tick', () => {
        const currentTime = this.getCurrentTime();
        this.renderer.renderProgress(currentTime / this.getDuration(), true);
        this.emit('timeupdate', currentTime);
        this.emit('audioprocess', currentTime);
      }));
    }
    initPlayerEvents() {
      this.subscriptions.push(this.onMediaEvent('timeupdate', () => {
        const currentTime = this.getCurrentTime();
        this.renderer.renderProgress(currentTime / this.getDuration(), this.isPlaying());
        this.emit('timeupdate', currentTime);
      }), this.onMediaEvent('play', () => {
        this.emit('play');
        this.timer.start();
      }), this.onMediaEvent('pause', () => {
        this.emit('pause');
        this.timer.stop();
      }), this.onMediaEvent('emptied', () => {
        this.timer.stop();
      }), this.onMediaEvent('ended', () => {
        this.emit('finish');
      }), this.onMediaEvent('seeking', () => {
        this.emit('seeking', this.getCurrentTime());
      }));
    }
    initRendererEvents() {
      this.subscriptions.push(
      // Seek on click
      this.renderer.on('click', relativeX => {
        if (this.options.interact) {
          this.seekTo(relativeX);
          this.emit('interaction', relativeX * this.getDuration());
          this.emit('click', relativeX);
        }
      }),
      // Scroll
      this.renderer.on('scroll', (startX, endX) => {
        const duration = this.getDuration();
        this.emit('scroll', startX * duration, endX * duration);
      }),
      // Redraw
      this.renderer.on('render', () => {
        this.emit('redraw');
      }));
      // Drag
      {
        let debounce;
        this.subscriptions.push(this.renderer.on('drag', relativeX => {
          if (!this.options.interact) return;
          // Update the visual position
          this.renderer.renderProgress(relativeX);
          // Set the audio position with a debounce
          clearTimeout(debounce);
          debounce = setTimeout(() => {
            this.seekTo(relativeX);
          }, this.isPlaying() ? 0 : 200);
          this.emit('interaction', relativeX * this.getDuration());
          this.emit('drag', relativeX);
        }));
      }
    }
    initPlugins() {
      var _a;
      if (!((_a = this.options.plugins) === null || _a === void 0 ? void 0 : _a.length)) return;
      this.options.plugins.forEach(plugin => {
        this.registerPlugin(plugin);
      });
    }
    /** Set new wavesurfer options and re-render it */
    setOptions(options) {
      this.options = Object.assign({}, this.options, options);
      this.renderer.setOptions(this.options);
      if (options.audioRate) {
        this.setPlaybackRate(options.audioRate);
      }
      if (options.mediaControls != null) {
        this.getMediaElement().controls = options.mediaControls;
      }
    }
    /** Register a wavesurfer.js plugin */
    registerPlugin(plugin) {
      plugin.init(this);
      this.plugins.push(plugin);
      // Unregister plugin on destroy
      this.subscriptions.push(plugin.once('destroy', () => {
        this.plugins = this.plugins.filter(p => p !== plugin);
      }));
      return plugin;
    }
    /** For plugins only: get the waveform wrapper div */
    getWrapper() {
      return this.renderer.getWrapper();
    }
    /** Get the current scroll position in pixels */
    getScroll() {
      return this.renderer.getScroll();
    }
    /** Get all registered plugins */
    getActivePlugins() {
      return this.plugins;
    }
    loadAudio(url, blob, channelData, duration) {
      return __awaiter(this, void 0, void 0, function* () {
        this.emit('load', url);
        if (this.isPlaying()) this.pause();
        this.decodedData = null;
        // Fetch the entire audio as a blob if pre-decoded data is not provided
        if (!blob && !channelData) {
          const onProgress = percentage => this.emit('loading', percentage);
          blob = yield Fetcher.fetchBlob(url, onProgress, this.options.fetchParams);
        }
        // Set the mediaelement source
        this.setSrc(url, blob);
        // Decode the audio data or use user-provided peaks
        if (channelData) {
          // Wait for the audio duration
          // It should be a promise to allow event listeners to subscribe to the ready and decode events
          duration = (yield Promise.resolve(duration || this.getDuration())) || (yield new Promise(resolve => {
            this.onceMediaEvent('loadedmetadata', () => resolve(this.getDuration()));
          })) || (yield Promise.resolve(0));
          this.decodedData = Decoder.createBuffer(channelData, duration);
        } else if (blob) {
          const arrayBuffer = yield blob.arrayBuffer();
          this.decodedData = yield Decoder.decode(arrayBuffer, this.options.sampleRate);
        }
        this.emit('decode', this.getDuration());
        // Render the waveform
        if (this.decodedData) {
          this.renderer.render(this.decodedData);
        }
        this.emit('ready', this.getDuration());
      });
    }
    /** Load an audio file by URL, with optional pre-decoded audio data */
    load(url, channelData, duration) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.loadAudio(url, undefined, channelData, duration);
      });
    }
    /** Load an audio blob */
    loadBlob(blob, channelData, duration) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.loadAudio('blob', blob, channelData, duration);
      });
    }
    /** Zoom the waveform by a given pixels-per-second factor */
    zoom(minPxPerSec) {
      if (!this.decodedData) {
        throw new Error('No audio loaded');
      }
      this.renderer.zoom(minPxPerSec);
      this.emit('zoom', minPxPerSec);
    }
    /** Get the decoded audio data */
    getDecodedData() {
      return this.decodedData;
    }
    /** Get decoded peaks */
    exportPeaks({
      channels = 1,
      maxLength = 8000,
      precision = 10000
    } = {}) {
      if (!this.decodedData) {
        throw new Error('The audio has not been decoded yet');
      }
      const channelsLen = Math.min(channels, this.decodedData.numberOfChannels);
      const peaks = [];
      for (let i = 0; i < channelsLen; i++) {
        const data = this.decodedData.getChannelData(i);
        const length = Math.min(data.length, maxLength);
        const scale = data.length / length;
        const sampledData = [];
        for (let j = 0; j < length; j++) {
          const n = Math.round(j * scale);
          const val = data[n];
          sampledData.push(Math.round(val * precision) / precision);
        }
        peaks.push(sampledData);
      }
      return peaks;
    }
    /** Get the duration of the audio in seconds */
    getDuration() {
      let duration = super.getDuration() || 0;
      // Fall back to the decoded data duration if the media duration is incorrect
      if ((duration === 0 || duration === Infinity) && this.decodedData) {
        duration = this.decodedData.duration;
      }
      return duration;
    }
    /** Toggle if the waveform should react to clicks */
    toggleInteraction(isInteractive) {
      this.options.interact = isInteractive;
    }
    /** Seek to a percentage of audio as [0..1] (0 = beginning, 1 = end) */
    seekTo(progress) {
      const time = this.getDuration() * progress;
      this.setTime(time);
    }
    /** Play or pause the audio */
    playPause() {
      return __awaiter(this, void 0, void 0, function* () {
        return this.isPlaying() ? this.pause() : this.play();
      });
    }
    /** Stop the audio and go to the beginning */
    stop() {
      this.pause();
      this.setTime(0);
    }
    /** Skip N or -N seconds from the current position */
    skip(seconds) {
      this.setTime(this.getCurrentTime() + seconds);
    }
    /** Empty the waveform by loading a tiny silent audio */
    empty() {
      this.load('', [[0]], 0.001);
    }
    /** Unmount wavesurfer */
    destroy() {
      this.emit('destroy');
      this.plugins.forEach(plugin => plugin.destroy());
      this.subscriptions.forEach(unsubscribe => unsubscribe());
      this.timer.destroy();
      this.renderer.destroy();
      super.destroy();
    }
  }

  function aiView() {
    var presetId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    module_default.data('ai', function () {
      return {
        required: [],
        isProcessing: false,
        isContentProcessing: false,
        isSubmitable: false,
        showActions: false,
        autosave: false,
        saving: false,
        readonly: true,
        output: '',
        images: [],
        showGallery: false,
        showWave: false,
        wave: null,
        waveReader: null,
        audioFile: null,
        audioIsPlaying: false,
        doc: {
          id: null,
          title: null,
          content: null,
          preset: {
            id: presetId
          }
        },
        showCost: false,
        cost: {
          token: 0,
          image: 0,
          audio: 0
        },
        init: function init() {
          var _this = this;
          this.$refs.form.querySelectorAll('[required]').forEach(function (element) {
            _this.required.push(element);
            element.addEventListener('input', function () {
              return _this.checkIsSubmitable();
            });
          });
          this.setupSpeech2Text();
          this.checkIsSubmitable();
          if (!this.doc.preset.id && this.isSubmitable) {
            this.submit('/text-generator');
          }
        },
        setupSpeech2Text: function setupSpeech2Text() {
          var _this2 = this;
          this.wave = WaveSurfer.create({
            container: this.$refs.wave,
            height: 56,
            waveColor: "rgb(".concat(getComputedStyle(document.documentElement).getPropertyValue('--color-content-dimmed'), ")"),
            progressColor: "rgb(".concat(getComputedStyle(document.documentElement).getPropertyValue('--color-content'), ")"),
            cursorColor: "rgb(".concat(getComputedStyle(document.documentElement).getPropertyValue('--color-content-dimmed'), ")"),
            barWidth: 4,
            cursorWidth: 0,
            barGap: 2,
            barRadius: 30,
            dragToSeek: true
          });
          this.wave.on('interaction', function () {
            if (!_this2.wave.isPlaying()) {
              _this2.wave.play();
              _this2.audioIsPlaying = true;
            }
          });
          this.wave.on('play', function () {
            _this2.audioIsPlaying = true;
          });
          this.wave.on('pause', function () {
            _this2.audioIsPlaying = false;
          });
          this.waveReader = new FileReader();
          this.waveReader.onload = function (event) {
            return _this2.wave.load(event.target.result);
          };
        },
        submit: function submit(path) {
          var _this3 = this;
          if (!this.isSubmitable || this.isProcessing || this.isContentProcessing) {
            return;
          }
          this.resetCost();
          this.isProcessing = true;
          this.isContentProcessing = true;
          this.readonly = true;
          var params = {};
          var _iterator = _createForOfIteratorHelper(new FormData(this.$refs.form)),
            _step;
          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var _step$value = _slicedToArray(_step.value, 2),
                key = _step$value[0],
                value = _step$value[1];
              params[key] = value;
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
          var query = new URLSearchParams(params);
          query.append('jwt', localStorage.getItem('jwt'));
          var es = new EventSource("api/ai/services".concat(path, "?").concat(query.toString()));
          var contentstarted = false;
          es.addEventListener('token', function (event) {
            var token = JSON.parse(event.data);
            _this3.doc.content = (contentstarted && _this3.doc.content ? _this3.doc.content : '') + token;
            _this3.output = markdownToHtml(_this3.doc.content);
            contentstarted = true;
          });
          es.addEventListener('image', function (event) {
            var image = JSON.parse(event.data);
            _this3.images.push(image.src);
          });
          es.addEventListener('usage', function (event) {
            return _this3.usageEventHandler(event);
          });
          es.addEventListener('close', function (event) {
            es.close();
            _this3.isContentProcessing = false;
            if (contentstarted) {
              _this3.generateTitle(_this3.doc.content);
            } else if (params.prompt) {
              _this3.generateTitle(params.prompt);
            }
          });
          es.onerror = function (event) {
            es.close();
            _this3.isContentProcessing = false;
            _this3.isProcessing = false;
            var msg = event.data || 'An unexpected error occurred! Please try again later!';
            if (msg == 'insufficient_credit') {
              msg = 'You have run out of credits. Please purchase more credits to continue using the app.';
            }
            window.toast.show(msg, 'ti ti-alert-triangle-filled');
          };
        },
        speech2text: function speech2text() {
          var _this4 = this;
          if (!this.isSubmitable || this.isProcessing || this.isContentProcessing) {
            return;
          }
          this.isProcessing = true;
          this.isContentProcessing = true;
          this.readonly = true;
          api.post('/ai/services/speech-to-text', new FormData(this.$refs.form)).then(function (response) {
            _this4.showWave = true;
            _this4.doc.content = response.data.text;
            _this4.output = markdownToHtml(_this4.doc.content);
            _this4.generateTitle(_this4.doc.content);
            _this4.isContentProcessing = false;
            _this4.showWave = true;
            _this4.waveReader.readAsDataURL(_this4.$refs.audioFile.files[0]);
            response.data.usages.forEach(function (usage) {
              _this4.showCost = true;
              switch (usage.type) {
                case 0:
                  _this4.cost.token += usage.value;
                  break;
                case 1:
                  _this4.cost.image += usage.value;
                  break;
                case 2:
                  _this4.cost.audio += usage.value;
                  break;
              }
            });
          })["catch"](function (error) {
            _this4.isProcessing = false;
            _this4.isContentProcessing = false;
            var msg = 'An unexpected error occurred! Please try again later!';
            if (error.response) {
              if (error.response.status == 402) {
                msg = 'You have run out of credits. Please purchase more credits to continue using the app.';
              } else if (error.response.data.message) {
                msg = error.response.data.message;
              }
            }
            window.toast.show(msg, 'ti ti-square-rounded-x-filled');
          });
        },
        generateTitle: function generateTitle(content) {
          var _this5 = this;
          var query = new URLSearchParams({
            content: content
          });
          query.append('jwt', localStorage.getItem('jwt'));
          var es = new EventSource("api/ai/services/title-generator?".concat(query.toString()));
          var titlestarted = false;
          es.addEventListener('token', function (event) {
            var token = JSON.parse(event.data);
            _this5.doc.title = (titlestarted && _this5.doc.title ? _this5.doc.title : '') + token;
            titlestarted = true;
          });
          es.addEventListener('usage', function (event) {
            return _this5.usageEventHandler(event);
          });
          es.addEventListener('close', function (event) {
            es.close();
            _this5.isProcessing = false;
            _this5.readonly = false;
            _this5.showActions = _this5.doc.title && _this5.doc.content;
            if (_this5.autosave) {
              _this5.saveDocument();
            }
          });
          es.onerror = function (event) {
            es.close();
            _this5.isProcessing = false;
            var msg = event.data || 'An unexpected error occurred! Please try again later!';
            if (msg == 'insufficient_credit') {
              msg = 'You have run out of credits. Please purchase more credits to continue using the app.';
            }
            window.toast.show(msg, 'ti ti-alert-triangle-filled');
          };
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
        },
        resetCost: function resetCost() {
          this.cost.token = 0;
          this.cost.image = 0;
          this.cost.audio = 0;
          this.showCost = false;
        },
        usageEventHandler: function usageEventHandler(event) {
          this.showCost = true;
          var usage = JSON.parse(event.data);
          switch (usage.type) {
            case 0:
              this.cost.token += usage.value;
              break;
            case 1:
              this.cost.image += usage.value;
              break;
            case 2:
              this.cost.audio += usage.value;
              break;
          }
        },
        copyDocumentContents: function copyDocumentContents() {
          navigator.clipboard.writeText(this.doc.content).then(function () {
            window.toast.show('Document copied to clipboard!', 'ti ti-square-rounded-check-filled');
          });
        },
        download: function download(format) {
          if (format == 'markdown') {
            var mimeType = 'text/markdown';
            var ext = 'md';
            var content = this.doc.content;
          } else if (format == 'html') {
            var mimeType = 'text/html';
            var ext = 'html';
            var content = "<html><head><meta charset=\"utf-8\" /><title>".concat(this.doc.title, "</title></head><body>").concat(this.output, "</body></html>");
          } else if (format == 'word') {
            var mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            var ext = 'docx';
            var content = "<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\" xmlns=\"http://www.w3.org/TR/REC-html40\"><head><meta charset=\"utf-8\" /><title>".concat(this.doc.title, "</title></head><body>").concat(this.output, "</body></html>");
          } else {
            var mimeType = 'text/plain';
            var ext = 'txt';
            var content = this.doc.content;
          }
          this.downloadFromUrl("data: ".concat(mimeType, "; charset = utf - 8, ").concat(encodeURIComponent(content), " "), this.doc.title, ext);
        },
        downloadFromUrl: function downloadFromUrl(url, filename, ext) {
          var anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = "".concat(filename, ".").concat(ext);
          document.body.appendChild(anchor);
          anchor.click();

          // Clean up
          document.body.removeChild(anchor);
        },
        saveDocument: function saveDocument() {
          var _this$doc$preset,
            _this6 = this;
          if (this.saving || !this.doc.title) {
            return;
          }
          this.saving = true;
          var params = {
            title: this.doc.title,
            content: this.doc.content,
            preset: (_this$doc$preset = this.doc.preset) === null || _this$doc$preset === void 0 ? void 0 : _this$doc$preset.id
          };
          api.post("/documents/".concat(this.doc.id || ''), params).then(function (response) {
            _this6.doc = response.data;
            _this6.saving = false;
            if (!_this6.autosave) {
              window.toast.show('Document saved successfully!', 'ti ti-square-rounded-check-filled');
            }
            _this6.autosave = true;
          });
        },
        deleteDocument: function deleteDocument() {
          var _this7 = this;
          api["delete"]("/documents/".concat(this.doc.id)).then(function (response) {
            _this7.doc.id = null;
            _this7.autosave = false;
            window.toast.show('Document deleted successfully!', 'ti ti-square-rounded-check-filled');
          });
        }
      };
    });
  }

  function debounce(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    if (null == wait) wait = 100;
    function later() {
      var last = Date.now() - timestamp;
      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    }
    return function () {
      context = this;
      args = arguments;
      timestamp = Date.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }
      return result;
    };
  }

  var token = /d{1,4}|D{3,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|W{1,2}|[LlopSZN]|"[^"]*"|'[^']*'/g;
  var timezone = /\b(?:[A-Z]{1,3}[A-Z][TC])(?:[-+]\d{4})?|((?:Australian )?(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time)\b/g;
  var timezoneClip = /[^-+\dA-Z]/g;
  function dateFormat(date, mask, utc, gmt) {
    if (arguments.length === 1 && typeof date === "string" && !/\d/.test(date)) {
      mask = date;
      date = undefined;
    }
    date = date || date === 0 ? date : new Date();
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    if (isNaN(date)) {
      throw TypeError("Invalid date");
    }
    mask = String(masks[mask] || mask || masks["default"]);
    var maskSlice = mask.slice(0, 4);
    if (maskSlice === "UTC:" || maskSlice === "GMT:") {
      mask = mask.slice(4);
      utc = true;
      if (maskSlice === "GMT:") {
        gmt = true;
      }
    }
    var _ = function _() {
      return utc ? "getUTC" : "get";
    };
    var _d = function d() {
      return date[_() + "Date"]();
    };
    var D = function D() {
      return date[_() + "Day"]();
    };
    var _m = function m() {
      return date[_() + "Month"]();
    };
    var y = function y() {
      return date[_() + "FullYear"]();
    };
    var _H = function H() {
      return date[_() + "Hours"]();
    };
    var _M = function M() {
      return date[_() + "Minutes"]();
    };
    var _s = function s() {
      return date[_() + "Seconds"]();
    };
    var _L = function L() {
      return date[_() + "Milliseconds"]();
    };
    var _o = function o() {
      return utc ? 0 : date.getTimezoneOffset();
    };
    var _W = function W() {
      return getWeek(date);
    };
    var _N = function N() {
      return getDayOfWeek(date);
    };
    var flags = {
      d: function d() {
        return _d();
      },
      dd: function dd() {
        return pad(_d());
      },
      ddd: function ddd() {
        return i18n.dayNames[D()];
      },
      DDD: function DDD() {
        return getDayName({
          y: y(),
          m: _m(),
          d: _d(),
          _: _(),
          dayName: i18n.dayNames[D()],
          short: true
        });
      },
      dddd: function dddd() {
        return i18n.dayNames[D() + 7];
      },
      DDDD: function DDDD() {
        return getDayName({
          y: y(),
          m: _m(),
          d: _d(),
          _: _(),
          dayName: i18n.dayNames[D() + 7]
        });
      },
      m: function m() {
        return _m() + 1;
      },
      mm: function mm() {
        return pad(_m() + 1);
      },
      mmm: function mmm() {
        return i18n.monthNames[_m()];
      },
      mmmm: function mmmm() {
        return i18n.monthNames[_m() + 12];
      },
      yy: function yy() {
        return String(y()).slice(2);
      },
      yyyy: function yyyy() {
        return pad(y(), 4);
      },
      h: function h() {
        return _H() % 12 || 12;
      },
      hh: function hh() {
        return pad(_H() % 12 || 12);
      },
      H: function H() {
        return _H();
      },
      HH: function HH() {
        return pad(_H());
      },
      M: function M() {
        return _M();
      },
      MM: function MM() {
        return pad(_M());
      },
      s: function s() {
        return _s();
      },
      ss: function ss() {
        return pad(_s());
      },
      l: function l() {
        return pad(_L(), 3);
      },
      L: function L() {
        return pad(Math.floor(_L() / 10));
      },
      t: function t() {
        return _H() < 12 ? i18n.timeNames[0] : i18n.timeNames[1];
      },
      tt: function tt() {
        return _H() < 12 ? i18n.timeNames[2] : i18n.timeNames[3];
      },
      T: function T() {
        return _H() < 12 ? i18n.timeNames[4] : i18n.timeNames[5];
      },
      TT: function TT() {
        return _H() < 12 ? i18n.timeNames[6] : i18n.timeNames[7];
      },
      Z: function Z() {
        return gmt ? "GMT" : utc ? "UTC" : formatTimezone(date);
      },
      o: function o() {
        return (_o() > 0 ? "-" : "+") + pad(Math.floor(Math.abs(_o()) / 60) * 100 + Math.abs(_o()) % 60, 4);
      },
      p: function p() {
        return (_o() > 0 ? "-" : "+") + pad(Math.floor(Math.abs(_o()) / 60), 2) + ":" + pad(Math.floor(Math.abs(_o()) % 60), 2);
      },
      S: function S() {
        return ["th", "st", "nd", "rd"][_d() % 10 > 3 ? 0 : (_d() % 100 - _d() % 10 != 10) * _d() % 10];
      },
      W: function W() {
        return _W();
      },
      WW: function WW() {
        return pad(_W());
      },
      N: function N() {
        return _N();
      }
    };
    return mask.replace(token, function (match) {
      if (match in flags) {
        return flags[match]();
      }
      return match.slice(1, match.length - 1);
    });
  }
  var masks = {
    default: "ddd mmm dd yyyy HH:MM:ss",
    shortDate: "m/d/yy",
    paddedShortDate: "mm/dd/yyyy",
    mediumDate: "mmm d, yyyy",
    longDate: "mmmm d, yyyy",
    fullDate: "dddd, mmmm d, yyyy",
    shortTime: "h:MM TT",
    mediumTime: "h:MM:ss TT",
    longTime: "h:MM:ss TT Z",
    isoDate: "yyyy-mm-dd",
    isoTime: "HH:MM:ss",
    isoDateTime: "yyyy-mm-dd'T'HH:MM:sso",
    isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'",
    expiresHeaderFormat: "ddd, dd mmm yyyy HH:MM:ss Z"
  };
  var i18n = {
    dayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    timeNames: ["a", "p", "am", "pm", "A", "P", "AM", "PM"]
  };
  var pad = function pad(val) {
    var len = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    return String(val).padStart(len, "0");
  };
  var getDayName = function getDayName(_ref) {
    var y = _ref.y,
      m = _ref.m,
      d = _ref.d,
      _ = _ref._,
      dayName = _ref.dayName,
      _ref$short = _ref["short"],
      _short = _ref$short === void 0 ? false : _ref$short;
    var today = new Date();
    var yesterday = new Date();
    yesterday.setDate(yesterday[_ + "Date"]() - 1);
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow[_ + "Date"]() + 1);
    var today_d = function today_d() {
      return today[_ + "Date"]();
    };
    var today_m = function today_m() {
      return today[_ + "Month"]();
    };
    var today_y = function today_y() {
      return today[_ + "FullYear"]();
    };
    var yesterday_d = function yesterday_d() {
      return yesterday[_ + "Date"]();
    };
    var yesterday_m = function yesterday_m() {
      return yesterday[_ + "Month"]();
    };
    var yesterday_y = function yesterday_y() {
      return yesterday[_ + "FullYear"]();
    };
    var tomorrow_d = function tomorrow_d() {
      return tomorrow[_ + "Date"]();
    };
    var tomorrow_m = function tomorrow_m() {
      return tomorrow[_ + "Month"]();
    };
    var tomorrow_y = function tomorrow_y() {
      return tomorrow[_ + "FullYear"]();
    };
    if (today_y() === y && today_m() === m && today_d() === d) {
      return _short ? "Tdy" : "Today";
    } else if (yesterday_y() === y && yesterday_m() === m && yesterday_d() === d) {
      return _short ? "Ysd" : "Yesterday";
    } else if (tomorrow_y() === y && tomorrow_m() === m && tomorrow_d() === d) {
      return _short ? "Tmw" : "Tomorrow";
    }
    return dayName;
  };
  var getWeek = function getWeek(date) {
    var targetThursday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    targetThursday.setDate(targetThursday.getDate() - (targetThursday.getDay() + 6) % 7 + 3);
    var firstThursday = new Date(targetThursday.getFullYear(), 0, 4);
    firstThursday.setDate(firstThursday.getDate() - (firstThursday.getDay() + 6) % 7 + 3);
    var ds = targetThursday.getTimezoneOffset() - firstThursday.getTimezoneOffset();
    targetThursday.setHours(targetThursday.getHours() - ds);
    var weekDiff = (targetThursday - firstThursday) / (864e5 * 7);
    return 1 + Math.floor(weekDiff);
  };
  var getDayOfWeek = function getDayOfWeek(date) {
    var dow = date.getDay();
    if (dow === 0) {
      dow = 7;
    }
    return dow;
  };
  var formatTimezone = function formatTimezone(date) {
    return (String(date).match(timezone) || [""]).pop().replace(timezoneClip, "").replace(/GMT\+0000/g, "UTC");
  };

  function getCategoryList() {
    var categories = [];
    var fetchedAll = false;
    function getList() {
      return _getList.apply(this, arguments);
    }
    function _getList() {
      _getList = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
        var cursor,
          params,
          response,
          _args = arguments;
        return _regeneratorRuntime().wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              cursor = _args.length > 0 && _args[0] !== undefined ? _args[0] : null;
              params = {};
              if (cursor) {
                params.starting_after = cursor;
              }
              _context.next = 5;
              return api.get('categories', {
                params: params
              });
            case 5:
              response = _context.sent;
              if (!(response.data.data.length == 0)) {
                _context.next = 9;
                break;
              }
              fetchedAll = true;
              return _context.abrupt("return");
            case 9:
              categories.push.apply(categories, _toConsumableArray(response.data.data));
              if (!fetchedAll) {
                getList(categories[categories.length - 1].id);
              }
              return _context.abrupt("return", categories);
            case 12:
            case "end":
              return _context.stop();
          }
        }, _callee);
      }));
      return _getList.apply(this, arguments);
    }
    return getList();
  }
  function getPlanList() {
    var plans = [];
    var fetchedAll = false;
    function getList() {
      return _getList2.apply(this, arguments);
    }
    function _getList2() {
      _getList2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
        var cursor,
          params,
          response,
          _args2 = arguments;
        return _regeneratorRuntime().wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              cursor = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : null;
              params = {
                'sort': 'price:asc'
              };
              if (cursor) {
                params.starting_after = cursor;
              }
              _context2.next = 5;
              return api.get('billing/plans', {
                params: params
              });
            case 5:
              response = _context2.sent;
              if (!(response.data.data.length == 0)) {
                _context2.next = 9;
                break;
              }
              fetchedAll = true;
              return _context2.abrupt("return");
            case 9:
              plans.push.apply(plans, _toConsumableArray(response.data.data));
              if (!fetchedAll) {
                getList(plans[plans.length - 1].id);
              }
              return _context2.abrupt("return", plans);
            case 12:
            case "end":
              return _context2.stop();
          }
        }, _callee2);
      }));
      return _getList2.apply(this, arguments);
    }
    return getList();
  }

  function listView() {
    module_default.data('list', function (basePath) {
      var sort = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      var filters = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
      var strings = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
      return {
        state: 'initial',
        filters: [],
        sort: [],
        orderby: null,
        dir: null,
        params: {
          query: null,
          sort: null
        },
        total: null,
        cursor: null,
        resources: [],
        isLoading: false,
        hasMore: true,
        isFiltered: false,
        currentResource: null,
        init: function init() {
          var _this = this;
          this.filters = filters;
          this.sort = sort;
          this.filters.forEach(function (filter) {
            return _this.params[filter.model] = null;
          });
          this.loadMore();
          this.getTotalCount();
          this.getCategories();
          this.retrieveResources();
          for (var key in this.params) {
            this.$watch('params.' + key, debounce(function (value) {
              return _this.retrieveResources(true);
            }, 200));
          }
          var sortparams = ['orderby', 'dir'];
          sortparams.forEach(function (param) {
            _this.$watch(param, function () {
              _this.params.sort = null;
              if (_this.orderby) {
                _this.params.sort = _this.orderby;
                if (_this.dir) {
                  _this.params.sort += ":".concat(_this.dir);
                }
              }
            });
          });
          this.$watch('params', function (params) {
            var isFiltered = false;
            for (var _key in params) {
              if (_key != 'sort' && params[_key]) {
                isFiltered = true;
              }
            }
            _this.isFiltered = isFiltered;
          });
        },
        getCategories: function getCategories() {
          var filter = this.filters.find(function (filter) {
            return filter.model == 'category';
          });
          if (!filter) {
            return;
          }
          getCategoryList().then(function (categories) {
            categories.forEach(function (category) {
              filter.options.push({
                value: category.id,
                label: category.title
              });
            });
          });
        },
        resetFilters: function resetFilters() {
          for (var key in this.params) {
            if (key != 'sort') {
              this.params[key] = null;
            }
          }
        },
        getTotalCount: function getTotalCount() {
          var _this2 = this;
          api.get("".concat(basePath, "/count")).then(function (response) {
            _this2.total = response.data.count;
          });
        },
        retrieveResources: function retrieveResources() {
          var _this3 = this;
          var reset = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
          this.isLoading = true;
          var params = {};
          for (var key in this.params) {
            if (this.params[key]) {
              params[key] = this.params[key];
            }
          }
          if (!reset && this.cursor) {
            params.starting_after = this.cursor;
          }
          api.get(basePath, {
            params: params
          }).then(function (response) {
            _this3.state = 'loaded';

            // Format resource.created_at and push to resources array
            response.data.data.forEach(function (resource) {
              // Format resource.created_at
              resource.created_at = dateFormat(new Date(resource.created_at * 1000), 'dd mmm, yyyy');
            });
            _this3.resources = reset ? response.data.data : _this3.resources.concat(response.data.data);
            if (_this3.resources.length > 0) {
              _this3.cursor = _this3.resources[_this3.resources.length - 1].id;
            } else {
              _this3.state = 'empty';
            }
            _this3.isLoading = false;
            _this3.hasMore = response.data.data.length >= 25;
          });
        },
        loadMore: function loadMore() {
          var _this4 = this;
          window.addEventListener('scroll', function () {
            if (_this4.hasMore && !_this4.isLoading && window.innerHeight + window.scrollY + 500 >= document.documentElement.scrollHeight) {
              _this4.retrieveResources();
            }
          });
        },
        toggleStatus: function toggleStatus(resource) {
          resource.status = resource.status == 1 ? 0 : 1;
          api.post("".concat(basePath, "/").concat(resource.id), {
            status: resource.status
          });
        },
        deleteResource: function deleteResource(resource) {
          this.currentResource = null;
          window.overlay.close();
          this.resources.splice(this.resources.indexOf(resource), 1);
          api["delete"]("".concat(basePath, "/").concat(resource.id)).then(function () {
            return window.toast.show(strings.delete_success, 'ti ti-trash');
          });
        }
      };
    });
  }

  function documentView() {
    module_default.data('document', function (doc) {
      return {
        doc: {},
        model: {},
        required: ['title'],
        isProcessing: false,
        output: '',
        init: function init() {
          var _this = this;
          this.doc = doc;
          this.model = _objectSpread2({}, this.doc);
          this.output = markdownToHtml(this.doc.content);
          this.required.forEach(function (field) {
            _this.$watch("model.".concat(field), function () {
              return _this.$refs.submit.disabled = !_this.isSubmitable();
            });
          });
        },
        submit: function submit() {
          if (!this.isSubmitable() || this.isProcessing) {
            return;
          }
          this.update();
        },
        update: function update() {
          var _this2 = this;
          this.isProcessing = true;
          var data = this.model;
          data.status = data.status ? 1 : 0;
          api.post("/documents/".concat(this.doc.id), this.model).then(function (response) {
            _this2.doc = response.data;
            _this2.model = _objectSpread2({}, _this2.doc);
            _this2.output = markdownToHtml(_this2.doc.content);
            _this2.isProcessing = false;
            window.toast.show('Document has been updated successfully!', 'ti ti-square-rounded-check-filled');
          });
        },
        isSubmitable: function isSubmitable() {
          for (var i = 0; i < this.required.length; i++) {
            var field = this.required[i];
            if (!this.model[field]) {
              return false;
            }
          }
          return true;
        },
        copyDocumentContents: function copyDocumentContents() {
          navigator.clipboard.writeText(this.doc.content).then(function () {
            window.toast.show('Document copied to clipboard!', 'ti ti-square-rounded-check-filled');
          });
        },
        download: function download(format) {
          if (format == 'markdown') {
            var mimeType = 'text/markdown';
            var ext = 'md';
            var content = this.doc.content;
          } else if (format == 'html') {
            var mimeType = 'text/html';
            var ext = 'html';
            var content = "<html><head><meta charset=\"utf-8\" /><title>".concat(this.model.title || this.doc.title, "</title></head><body>").concat(this.output, "</body></html>");
          } else if (format == 'word') {
            var mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            var ext = 'docx';
            var content = "<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\" xmlns=\"http://www.w3.org/TR/REC-html40\"><head><meta charset=\"utf-8\" /><title>".concat(this.doc.title, "</title></head><body>").concat(this.output, "</body></html>");
          } else {
            var mimeType = 'text/plain';
            var ext = 'txt';
            var content = this.doc.content;
          }
          this.downloadFromUrl("data: ".concat(mimeType, "; charset = utf - 8, ").concat(encodeURIComponent(content), " "), this.model.title || this.doc.title, ext);
        },
        downloadFromUrl: function downloadFromUrl(url, filename, ext) {
          var anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = "".concat(filename, ".").concat(ext);
          document.body.appendChild(anchor);
          anchor.click();

          // Clean up
          document.body.removeChild(anchor);
        }
      };
    });
  }

  function billingView() {
    module_default.data('subscription', function (subscription) {
      var packs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      return {
        subscription: subscription,
        packs: packs,
        showCancelModal: false,
        init: function init() {
          if (subscription) {
            subscription.token_credit_percentage = subscription.token_credit == null || subscription.plan.token_credit == null ? '100' : Math.round(subscription.token_credit / subscription.plan.token_credit * 100 + Number.EPSILON);
            subscription.image_credit_percentage = subscription.image_credit == null || subscription.plan.image_credit == null ? '100' : Math.round(subscription.image_credit / subscription.plan.image_credit * 100 + Number.EPSILON);
            subscription.audio_credit_percentage = subscription.audio_credit == null || subscription.plan.audio_credit == null ? '100' : Math.round(subscription.audio_credit / subscription.plan.audio_credit * 100 + Number.EPSILON);
          }
        },
        cancelSubscription: function cancelSubscription() {
          api["delete"]("/billing/subscription").then(function () {
            window.toast.show('Subscription cancelled!', 'ti ti-square-rounded-check-filled');
            window.overlay.close();
          });
        }
      };
    });
  }

  function checkoutView() {
    module_default.data('checkout', function () {
      var plan = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      return {
        state: 'initial',
        plan: {},
        isProcessing: false,
        plans: {
          monthly: [],
          yearly: [],
          onetime: []
        },
        isVisible: false,
        cycle: null,
        showCycleSelector: false,
        total: 0,
        init: function init() {
          var _this = this;
          this.setPlan(plan);
          getPlanList().then(function (plans) {
            _this.total = plans.length;
            _this.$refs.loading.remove();
            _this.state = _this.total > 0 ? 'normal' : 'empty';
            for (var i = 0; i < plans.length; i++) {
              var _plan = plans[i];
              if (_plan.billing_cycle == 'monthly') {
                _this.plans.monthly.push(_plan);
                continue;
              }
              if (_plan.billing_cycle == 'yearly') {
                _this.plans.yearly.push(_plan);
                continue;
              }
              if (_plan.billing_cycle == 'one-time') {
                _this.plans.onetime.push(_plan);
                continue;
              }
            }

            // Set cycle to the first available cycle
            if (_this.plans.monthly.length > 0) {
              _this.cycle = 'monthly';
            } else if (_this.plans.yearly.length > 0) {
              _this.cycle = 'yearly';
            } else if (_this.plans.onetime.length > 0) {
              _this.cycle = 'onetime';
            }
            var count = 0;
            if (_this.plans.monthly.length > 0) {
              count++;
            }
            if (_this.plans.yearly.length > 0) {
              count++;
            }
            if (_this.plans.onetime.length > 0) {
              count++;
            }
            if (count > 1) {
              _this.showCycleSelector = true;
            }
            if (!_this.plan.id && _this.plans[_this.cycle].length > 0) {
              _this.setPlan(_this.plans[_this.cycle][0]);
            }
          });
        },
        setPlan: function setPlan(plan) {
          this.plan = plan;
          window.checkout.plan = plan;
          if (plan.id) {
            window.history.pushState({}, plan.name, "/app/billing/checkout/".concat(plan.id));
          } else {
            window.history.pushState({}, '', "/app/billing/checkout");
          }
        },
        submitFreeForm: function submitFreeForm(form) {
          return _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
            var button;
            return _regeneratorRuntime().wrap(function _callee$(_context) {
              while (1) switch (_context.prev = _context.next) {
                case 0:
                  button = form.querySelector('button');
                  if (!(button.disabled || button.hasAttribute('processing'))) {
                    _context.next = 3;
                    break;
                  }
                  return _context.abrupt("return");
                case 3:
                  window.checkout.error(null);
                  button.setAttribute('processing', '');
                  _context.next = 7;
                  return window.checkout.createSubscription();
                case 7:
                  _context.next = 9;
                  return window.checkout.activateSubscription();
                case 9:
                case "end":
                  return _context.stop();
              }
            }, _callee);
          }))();
        }
      };
    });
  }
  module_default.store('checkout', {
    error: null,
    subscription: null
  });
  var Checkout = /*#__PURE__*/function () {
    function Checkout() {
      _classCallCheck(this, Checkout);
      _defineProperty(this, "plan", null);
      checkoutView();
    }
    _createClass(Checkout, [{
      key: "error",
      value: function error(message) {
        module_default.store('checkout', _objectSpread2(_objectSpread2({}, module_default.store('checkout')), {
          error: message
        }));
      }
    }, {
      key: "createSubscription",
      value: function () {
        var _createSubscription = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
          var gateway,
            response,
            data,
            _args2 = arguments;
          return _regeneratorRuntime().wrap(function _callee2$(_context2) {
            while (1) switch (_context2.prev = _context2.next) {
              case 0:
                gateway = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : '';
                _context2.prev = 1;
                _context2.next = 4;
                return api.post('/billing/checkout', {
                  id: this.plan.id,
                  // Set by window.checkout.plan
                  gateway: gateway
                });
              case 4:
                response = _context2.sent;
                data = response.data;
                module_default.store('checkout', _objectSpread2(_objectSpread2({}, module_default.store('checkout')), {
                  subscription: data.subscription
                }));
                return _context2.abrupt("return", data);
              case 10:
                _context2.prev = 10;
                _context2.t0 = _context2["catch"](1);
                return _context2.abrupt("return", {
                  error: _context2.t0.response.data.message || _context2.t0.message
                });
              case 13:
              case "end":
                return _context2.stop();
            }
          }, _callee2, this, [[1, 10]]);
        }));
        function createSubscription() {
          return _createSubscription.apply(this, arguments);
        }
        return createSubscription;
      }()
    }, {
      key: "activateSubscription",
      value: function () {
        var _activateSubscription = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
          var externalId,
            data,
            subscriptionId,
            _args3 = arguments;
          return _regeneratorRuntime().wrap(function _callee3$(_context3) {
            while (1) switch (_context3.prev = _context3.next) {
              case 0:
                externalId = _args3.length > 0 && _args3[0] !== undefined ? _args3[0] : null;
                data = {};
                subscriptionId = module_default.store('checkout').subscription.id;
                if (externalId) {
                  data.external_id = externalId;
                }
                _context3.next = 6;
                return api.post("/billing/subscriptions/".concat(subscriptionId, "/activate"), data);
              case 6:
                window.location.href = "app/billing/subscriptions/".concat(subscriptionId, "?success");
              case 7:
              case "end":
                return _context3.stop();
            }
          }, _callee3);
        }));
        function activateSubscription() {
          return _activateSubscription.apply(this, arguments);
        }
        return activateSubscription;
      }()
    }]);
    return Checkout;
  }();

  function accountView() {
    module_default.data('account', function () {
      return {
        required: [],
        isProcessing: false,
        isSubmitable: false,
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
          var data = {};
          var _iterator = _createForOfIteratorHelper(new FormData(this.$refs.form)),
            _step;
          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var _step$value = _slicedToArray(_step.value, 2),
                key = _step$value[0],
                value = _step$value[1];
              data[key] = value;
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
          api.post("/account".concat(this.$refs.form.dataset.path || ''), data).then(function (response) {
            if (response.data.jwt) {
              // Save the JWT to local storage 
              // to be used for future api requests
              localStorage.setItem('jwt', response.data.jwt);
            }
            _this2.isProcessing = false;
            window.toast.show(_this2.$refs.form.dataset.successMsg || 'Changes saved successfully!', 'ti ti-square-rounded-check-filled');
          })["catch"](function (error) {
            var msg = 'An unexpedted error occured. Please try again later.';
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
        },
        resendIn: 0,
        resendVerificationEmail: function resendVerificationEmail() {
          var _this3 = this;
          if (this.resent) {
            return;
          }
          this.resendIn = 60;
          var interval = setInterval(function () {
            _this3.resendIn--;
            if (_this3.resendIn <= 0) {
              clearInterval(interval);
            }
          }, 1000);
          api.post('/account/verification').then(function (response) {
            window.toast.show('Email sent successfully!', 'ti ti-square-rounded-check-filled');
          })["catch"](function (error) {
            var msg = 'An unexpedted error occured. Please try again later.';
            if (error.response && error.response.data.message) {
              msg = error.response.data.message;
            }
            window.toast.show(msg, 'ti ti-square-rounded-x-filled');
          });
        }
      };
    });
  }

  function searchForm() {
    module_default.data('search', function () {
      return {
        isProcessing: false,
        showResults: false,
        results: [],
        init: function init() {
          this.bindKeyboardShortcuts();
        },
        bindKeyboardShortcuts: function bindKeyboardShortcuts() {
          var _this = this;
          window.addEventListener('keydown', function (e) {
            if (e.metaKey && e.key === 'k') {
              e.preventDefault();
              _this.$refs.input.focus();
            } else if (e.key === 'Escape') {
              _this.$refs.input.blur();
              _this.showResults = false;
            }
          });
        },
        search: function search(query) {
          var _this2 = this;
          this.isProcessing = true;
          api.get('/search', {
            params: {
              query: query
            }
          }).then(function (response) {
            _this2.results = response.data.data;
            _this2.isProcessing = false;
            _this2.showResults = _this2.results.length > 0;
          })["catch"](function (error) {
            _this2.isProcessing = false;
            _this2.showResults = false;
          });
        }
      };
    });
  }

  function dashboardView() {
    module_default.data('dashboard', function () {
      return {
        documents: [],
        documentsFetched: false,
        init: function init() {
          searchForm();
          this.getRecentDocuments();
        },
        getRecentDocuments: function getRecentDocuments() {
          var _this = this;
          var params = {
            limit: 5,
            sort: 'created_at:desc'
          };
          api.get('/documents', {
            params: params
          }).then(function (response) {
            _this.documentsFetched = true;

            // Format document.created_at and push to documents array
            response.data.data.forEach(function (resource) {
              // Format resource.created_at
              resource.created_at = dateFormat(new Date(resource.created_at * 1000), 'dd mmm, yyyy');
            });
            _this.documents = response.data.data;
          });
        }
      };
    });
  }

  function voiceover() {
    module_default.data('voiceover', function () {
      var sort = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var filters = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      return {
        state: 'initial',
        isFiltered: false,
        filters: filters,
        sort: sort,
        orderby: null,
        dir: null,
        params: {
          query: null,
          sort: null
        },
        total: null,
        isLoading: false,
        allVoices: [],
        voices: [],
        selected: null,
        prompt: '',
        isProcessing: false,
        docs: [],
        languages: {
          'eleven_multilingual_v2': ["English", "Japanese", "Chinese", "German", "Hindi", "French", "Korean", "Portuguese", "Italian", "Spanish", "Indonesian", "Dutch", "Turkish", "Flipino", "Polish", "Swedish", "Bulgarian", "Romanian", "Arabic", "Czech", "Greek", "Finnish", "Croatian", "Malay", "Slowak", "Danish", "Tamil", "Ukranian", "Russian"],
          'eleven_multilingual_v1': ["English", "German", "Polish", "Spanish", "Italian", "French", "Portuguese", "Hindi", "Arabic"],
          'eleven_monolingual_v1': ["English"],
          'eleven_turbo_v2': ["English"]
        },
        init: function init() {
          var _this = this;
          this.filters.forEach(function (filter) {
            return _this.params[filter.model] = null;
          });
          this.getVoices();
          for (var key in this.params) {
            this.$watch('params.' + key, debounce(function (value) {
              return _this.filter();
            }, 200));
          }
          var sortparams = ['orderby', 'dir'];
          sortparams.forEach(function (param) {
            _this.$watch(param, function () {
              _this.params.sort = null;
              if (_this.orderby) {
                _this.params.sort = _this.orderby;
                if (_this.dir) {
                  _this.params.sort += ":".concat(_this.dir);
                }
              }
            });
          });
          this.$watch('params', function (params) {
            var isFiltered = false;
            for (var _key in params) {
              if (_key != 'sort' && params[_key]) {
                isFiltered = true;
              }
            }
            _this.isFiltered = isFiltered;
          });
        },
        getVoices: function getVoices() {
          var _this2 = this;
          api.get('/voices', {
            params: this.params
          }).then(function (response) {
            _this2.state = 'loaded';
            _this2.allVoices = response.data.data;
            _this2.total = _this2.allVoices.length;
            _this2.filter();
          })["catch"](function (error) {
            _this2.state = 'loaded';
          });
        },
        selectVoice: function selectVoice(voice) {
          this.selected = voice;
        },
        filter: function filter() {
          var _this3 = this;
          var voices = this.allVoices;
          this.filters.forEach(function (filter) {
            if (_this3.params[filter.model]) {
              voices = voices.filter(function (voice) {
                return voice[filter.model] == _this3.params[filter.model];
              });
            }
          });
          if (this.params.query) {
            voices = voices.filter(function (voice) {
              return voice.name.toLowerCase().includes(_this3.params.query.toLowerCase()) || voice.tone && voice.tone.toLowerCase().includes(_this3.params.query.toLowerCase());
            });
          }
          if (this.params.sort) {
            var _this$params$sort$spl = this.params.sort.split(':'),
              _this$params$sort$spl2 = _slicedToArray(_this$params$sort$spl, 2),
              orderby = _this$params$sort$spl2[0],
              dir = _this$params$sort$spl2[1];
            voices = voices.sort(function (a, b) {
              if (a[orderby] < b[orderby]) {
                return dir == 'asc' ? -1 : 1;
              }
              if (a[orderby] > b[orderby]) {
                return dir == 'asc' ? 1 : -1;
              }
              return 0;
            });
          }
          this.voices = voices;
        },
        resetFilters: function resetFilters() {
          for (var key in this.params) {
            if (key != 'sort') {
              this.params[key] = null;
            }
          }
        },
        submit: function submit() {
          if (this.isProcessing) {
            return;
          }
          this.isProcessing = true;
          if ('demo' in this.$refs.form.dataset) {
            this.showSamples();
          } else {
            this.docs.unshift({
              id: Date.now(),
              title: null,
              audio: null,
              isProcessing: false,
              text: null,
              isSample: false
            });
            this.generateTitle(this.prompt);
            this.generateAudio();
          }
        },
        showSamples: function showSamples() {
          var _this4 = this;
          this.docs = [];
          api.get('https://cdn.aikeedo.com/voiceover/samples/data.json').then(function (resp) {
            _this4.isProcessing = false;
            if (_this4.selected.external_id in resp.data) {
              for (var i = 0; i < resp.data[_this4.selected.external_id].length; i++) {
                var sample = resp.data[_this4.selected.external_id][i];
                _this4.docs.push({
                  id: 'index-' + _this4.selected.external_id + '-' + i,
                  title: sample.language,
                  audio: sample.sample_url,
                  isProcessing: false,
                  text: sample.text,
                  isSample: true
                });
              }
            }
          });
        },
        generateAudio: function generateAudio() {
          var _this5 = this;
          this.docs[0].isProcessing = true;
          var data = {
            model: this.selected.model,
            id: this.selected.external_id,
            prompt: this.prompt
          };
          api.post('/ai/services/text-to-speech', data, {
            responseType: 'blob'
          }).then(function (response) {
            _this5.docs[0].audio = URL.createObjectURL(response.data);
            _this5.docs[0].isProcessing = _this5.docs[0].title === null;
            _this5.$nextTick().then(function () {
              return window.waves['wave-' + _this5.docs[0].id].loadBlob(response.data);
            });
            _this5.isProcessing = _this5.docs[0].isProcessing;
          })["catch"](function (error) {
            _this5.docs[0].isProcessing = _this5.docs[0].title === null;
            _this5.docs[0].audio = 'error';
            var msg = 'An unexpected error occurred! Please try again later!';
            if (error.response) {
              if (error.response.status == 402) {
                msg = 'You have run out of credits. Please purchase more credits to continue using the app.';
              } else if (error.response.data.message) {
                msg = error.response.data.message;
              }
            }
            window.toast.show(msg, 'ti ti-square-rounded-x-filled');
          });
        },
        generateTitle: function generateTitle(content) {
          var _this6 = this;
          this.docs[0].isProcessing = true;
          var query = new URLSearchParams({
            content: content
          });
          query.append('jwt', localStorage.getItem('jwt'));
          var es = new EventSource("api/ai/services/title-generator?".concat(query.toString()));
          var titlestarted = false;
          es.addEventListener('token', function (event) {
            var token = JSON.parse(event.data);
            _this6.docs[0].title = ((titlestarted && _this6.docs[0].title ? _this6.docs[0].title : '') + token).replace(/^['"]|['"]$/g, '');
            titlestarted = true;
          });
          es.addEventListener('close', function (event) {
            es.close();
            _this6.docs[0].isProcessing = _this6.docs[0].audio === null;
            _this6.isProcessing = _this6.docs[0].isProcessing;
          });
          es.onerror = function (event) {
            es.close();
            _this6.docs[0].isProcessing = _this6.docs[0].audio === null;
            _this6.isProcessing = _this6.docs[0].isProcessing;
            _this6.docs[0].title = '';
            var msg = event.data || 'An unexpected error occurred! Please try again later!';
            if (msg == 'insufficient_credit') {
              msg = 'You have run out of credits. Please purchase more credits to continue using the app.';
            }
            window.toast.show(msg, 'ti ti-alert-triangle-filled');
          };
        }
      };
    });
    var currentPlaying = null;
    window.waves = [];
    module_default.data("wave", function () {
      var url = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      return {
        wave: null,
        isPlaying: false,
        progress: '00:00',
        isMuted: false,
        init: function init() {
          var _this7 = this;
          this.wave = WaveSurfer.create({
            container: this.$refs.wave,
            height: 32,
            waveColor: "rgb(".concat(getComputedStyle(document.documentElement).getPropertyValue('--color-content-dimmed'), ")"),
            progressColor: "rgb(".concat(getComputedStyle(document.documentElement).getPropertyValue('--color-content'), ")"),
            cursorColor: "rgb(".concat(getComputedStyle(document.documentElement).getPropertyValue('--color-content-dimmed'), ")"),
            barWidth: 2,
            cursorWidth: 0,
            barGap: 2,
            barRadius: 30,
            dragToSeek: true,
            url: url
          });
          this.$nextTick(function () {
            window.waves[_this7.$el.id || _this7.$id()] = _this7.wave;
          });
          this.wave.on('interaction', function () {
            if (!_this7.wave.isPlaying()) {
              _this7.wave.play();
              _this7.isPlaying = true;
            }
          });
          this.wave.on('audioprocess', function (time) {
            var date = new Date(0);
            date.setSeconds(time);
            if (time > 3600) {
              _this7.progress = date.toISOString().substring(11, 19);
            } else {
              _this7.progress = date.toISOString().substring(14, 19);
            }
          });
          this.wave.on('play', function () {
            if (currentPlaying && currentPlaying != _this7.wave) {
              currentPlaying.pause();
            }
            currentPlaying = _this7.wave;
            _this7.isPlaying = true;
          });
          this.wave.on('pause', function () {
            _this7.isPlaying = false;
          });
        }
      };
    });
  }

  function imagineView() {
    module_default.data('imagine', function () {
      return {
        required: [],
        isProcessing: false,
        isSubmitable: false,
        currentResource: null,
        images: [],
        model: null,
        width: null,
        height: null,
        config: {
          'dall-e-2': {
            sizes: [{
              width: 256,
              height: 256
            }, {
              width: 512,
              height: 512
            }, {
              width: 1024,
              height: 1024
            }],
            style: 'default'
          },
          'dall-e-3': {
            sizes: [{
              width: 1024,
              height: 1024
            }, {
              width: 1792,
              height: 1024
            }, {
              width: 1024,
              height: 1792
            }],
            style: 'default'
          },
          'stable-diffusion-v1-6': {
            sizes: [{
              width: 320,
              height: 320
            }, {
              width: 640,
              height: 640
            }, {
              width: 1280,
              height: 1280
            }, {
              width: 1536,
              height: 1536
            }, {
              width: 1024,
              height: 1024
            }, {
              width: 1152,
              height: 896
            }, {
              width: 1216,
              height: 832
            }, {
              width: 1344,
              height: 768
            }, {
              width: 640,
              height: 1536
            }, {
              width: 768,
              height: 1344
            }, {
              width: 832,
              height: 1216
            }, {
              width: 896,
              height: 1152
            }],
            style: 'stable-diffusion'
          },
          'stable-diffusion-xl-1024-v1-0': {
            sizes: [{
              width: 1024,
              height: 1024
            }, {
              width: 1152,
              height: 896
            }, {
              width: 1216,
              height: 832
            }, {
              width: 1344,
              height: 768
            }, {
              width: 1536,
              height: 640
            }, {
              width: 640,
              height: 1536
            }, {
              width: 768,
              height: 1344
            }, {
              width: 832,
              height: 1216
            }, {
              width: 896,
              height: 1152
            }],
            style: 'stable-diffusion'
          },
          'stable-diffusion-512-v2-1': {
            sizes: [{
              width: 320,
              height: 320
            }, {
              width: 640,
              height: 640
            }, {
              width: 1024,
              height: 1024
            }, {
              width: 1152,
              height: 896
            }, {
              width: 1216,
              height: 832
            }, {
              width: 1344,
              height: 768
            }, {
              width: 640,
              height: 1536
            }, {
              width: 768,
              height: 1344
            }, {
              width: 832,
              height: 1216
            }, {
              width: 896,
              height: 1152
            }],
            style: 'stable-diffusion'
          },
          'stable-diffusion-xl-beta-v2-2-2': {
            sizes: [{
              width: 320,
              height: 320
            }, {
              width: 512,
              height: 512
            }, {
              width: 512,
              height: 896
            }, {
              width: 896,
              height: 512
            }],
            style: 'stable-diffusion'
          }
        },
        sizes: [{
          'model': 'dall-e-2',
          'options': [{
            width: 256,
            height: 256
          }, {
            width: 512,
            height: 512
          }, {
            width: 1024,
            height: 1024
          }]
        }, {
          'model': 'dall-e-3',
          'options': [{
            width: 1024,
            height: 1024
          }, {
            width: 1792,
            height: 1024
          }, {
            width: 1024,
            height: 1792
          }]
        }, {
          'model': 'stable-diffusion-v1-6',
          'options': [{
            width: 320,
            height: 320
          }, {
            width: 640,
            height: 640
          }, {
            width: 1280,
            height: 1280
          }, {
            width: 1536,
            height: 1536
          }, {
            width: 1024,
            height: 1024
          }, {
            width: 1152,
            height: 896
          }, {
            width: 1216,
            height: 832
          }, {
            width: 1344,
            height: 768
          }, {
            width: 640,
            height: 1536
          }, {
            width: 768,
            height: 1344
          }, {
            width: 832,
            height: 1216
          }, {
            width: 896,
            height: 1152
          }]
        }, {
          'model': 'stable-diffusion-xl-1024-v1-0',
          'options': [{
            width: 1024,
            height: 1024
          }, {
            width: 1152,
            height: 896
          }, {
            width: 1216,
            height: 832
          }, {
            width: 1344,
            height: 768
          }, {
            width: 1536,
            height: 640
          }, {
            width: 640,
            height: 1536
          }, {
            width: 768,
            height: 1344
          }, {
            width: 832,
            height: 1216
          }, {
            width: 896,
            height: 1152
          }]
        }, {
          'model': 'stable-diffusion-512-v2-1',
          'options': [{
            width: 320,
            height: 320
          }, {
            width: 640,
            height: 640
          }, {
            width: 1024,
            height: 1024
          }, {
            width: 1152,
            height: 896
          }, {
            width: 1216,
            height: 832
          }, {
            width: 1344,
            height: 768
          }, {
            width: 640,
            height: 1536
          }, {
            width: 768,
            height: 1344
          }, {
            width: 832,
            height: 1216
          }, {
            width: 896,
            height: 1152
          }]
        }, {
          'model': 'stable-diffusion-xl-beta-v2-2-2',
          'options': [{
            width: 320,
            height: 320
          }, {
            width: 512,
            height: 512
          }, {
            width: 512,
            height: 896
          }, {
            width: 896,
            height: 512
          }]
        }],
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
        submit: function submit(path) {
          var _this2 = this;
          if (!this.isSubmitable || this.isProcessing) {
            return;
          }
          this.isProcessing = true;
          api.post("/ai/services/image-generator", new FormData(this.$refs.form)).then(function (response) {
            _this2.isProcessing = false;
            if (response.data && response.data.id) {
              _this2.images.unshift(response.data);
            } else {
              var msg = 'An unexpected error occurred! Please try again later!';
              window.toast.show(msg, 'ti ti-square-rounded-x-filled');
            }
          })["catch"](function (error) {
            var msg = 'An unexpected error occurred! Please try again later!';
            if (error.response) {
              if (error.response.status == 402) {
                msg = 'You have run out of credits. Please purchase more credits to continue using the app.';
              } else if (error.response.data.message) {
                msg = error.response.data.message;
              }
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
        },
        copyImgToClipboard: function copyImgToClipboard(imgUrl) {
          fetch(imgUrl).then(function (res) {
            return res.blob();
          }).then(function (blob) {
            var item = new ClipboardItem(_defineProperty({}, blob.type, blob));
            return navigator.clipboard.write([item]);
          }).then(function () {
            window.toast.show('Image copied to clipboard!', 'ti ti-square-rounded-check-filled');
          });
        }
      };
    });
  }

  initState();
  window.checkout = new Checkout();
  dashboardView();
  listView();
  aiView();
  imagineView();
  documentView();
  billingView();
  accountView();
  voiceover();
  module_default.start();

})();
//# sourceMappingURL=app.js.map
