let _addToast = null;

export function registerToastHandler(fn) {
  _addToast = fn;
}

export function toast(message, type = 'info') {
  if (_addToast) _addToast({ message, type, id: Date.now() });
}

export const toastSuccess = (msg) => toast(msg, 'success');
export const toastError = (msg) => toast(msg, 'error');
export const toastInfo = (msg) => toast(msg, 'info');
