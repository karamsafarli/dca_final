/**
 * Leading + trailing throttle: runs at most once per `waitMs`, and always once
 * more after the last call so the UI ends up showing the latest state.
 * Used so an SOS flood (hundreds of socket events per second) costs the
 * dispatcher panel ~1 refresh per second instead of hundreds.
 */
export function throttle(fn, waitMs) {
  let last = 0;
  let timer = null;
  let pendingArgs = null;

  const invoke = (args) => {
    last = Date.now();
    fn(...args);
  };

  const throttled = (...args) => {
    const remaining = waitMs - (Date.now() - last);
    if (remaining <= 0 && !timer) {
      invoke(args);
      return;
    }
    pendingArgs = args;
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        if (pendingArgs) {
          const a = pendingArgs;
          pendingArgs = null;
          invoke(a);
        }
      }, Math.max(remaining, 0));
    }
  };

  throttled.cancel = () => {
    clearTimeout(timer);
    timer = null;
    pendingArgs = null;
  };
  return throttled;
}
