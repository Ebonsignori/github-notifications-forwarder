/**
 * Delay in an async function for provided milliseconds
 */
async function delay(milliseconds) {
  new Promise(resolve => setTimeout(resolve, milliseconds))
}
