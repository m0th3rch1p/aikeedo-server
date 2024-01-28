export function __(str) {
    console.log(window.locale.messages);
    console.log(str);
    console.log(window.locale.messages[str]);
    return window.locale.messages[str] || str;
}