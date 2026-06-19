/**
 * @file counter.ts
 * @description Provides functionality to set up a basic interactive counter on a button element.
 * This is primarily used for testing or simple interactive components.
 */

/**
 * Initializes a counter on a given HTML button element.
 * Attaches a click event listener that increments the counter value and updates the button text.
 *
 * @param {HTMLButtonElement} element - The HTML button element to attach the counter to.
 */
export function setupCounter(element: HTMLButtonElement) {
  let counter = 0
  const setCounter = (count: number) => {
    counter = count
    element.innerHTML = `Count is ${counter}`
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(0)
}
