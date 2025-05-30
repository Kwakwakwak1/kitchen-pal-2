
export const loadState = <T,>(key: string): T | undefined => {
  try {
    const serializedState = localStorage.getItem(key);
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState) as T;
  } catch (error) {
    console.warn(`Error loading state for key "${key}" from localStorage:`, error);
    return undefined;
  }
};

export const saveState = <T,>(key: string, state: T): void => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(key, serializedState);
  } catch (error) {
    console.warn(`Error saving state for key "${key}" to localStorage:`, error);
  }
};
    