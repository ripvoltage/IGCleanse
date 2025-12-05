;(async function () {
const DELETION_BATCH_SIZE = 15
const DELAY_BETWEEN_ACTIONS_MS = 1500
const DELAY_BETWEEN_CHECKBOX_CLICKS_MS = 150
// CRITICAL CHANGE: Reduced delay after clicking "Select"
const DELAY_AFTER_SELECT_CLICK_MS = 2000 // Reduced from 8000ms to 2 seconds
const DELAY_AFTER_COMMENTS_VISIBLE_MS = 1000
// Custom delays:
const DELAY_AFTER_ERROR_DISMISS_MS = 1000 // 3 seconds wait after dismissing error
const MAX_WAIT_FOR_ACTION_MS = 45000 // Max wait for Select button
const MAX_WAIT_FOR_OK_MODAL_MS = 15000 // 15 seconds wait for OK button to appear
const MAX_RETRIES = 90
// Supported UI texts for buttons and errors
const DELETE_BUTTON_TEXTS = ['Delete', 'Löschen']
const SELECT_BUTTON_TEXTS = ['Select', 'Auswählen']
const OK_BUTTON_TEXTS = ['OK', 'Okay', 'Aceptar']
// *** CHECKBOX SELECTOR ***
const CHECKBOX_SELECTOR = '[aria-label="Toggle checkbox"]'
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
// 1. General element wait function (used for Confirm button and fallbacks)
const waitForElement = async (selector, timeout = 30000) => {
const startTime = Date.now()
while (Date.now() - startTime < timeout) {
const element = document.querySelector(selector)
if (element) return element
await delay(100)
}
throw new Error(`Element with selector "${selector}" not found within ${timeout}ms`)
}
const clickElement = async (element) => {
if (!element) throw new Error('Element not found')
element.scrollIntoView({ behavior: 'smooth', block: 'center' })
element.click()
}
// 2. DEDICATED function to find the Select button
const findSelectButton = async (timeout = MAX_WAIT_FOR_ACTION_MS) => {
const startTime = Date.now();
while (Date.now() - startTime < timeout) {
// Find the select button by its text content inside any span
const selectButtonSpan = [...document.querySelectorAll('span')]
.find(el => SELECT_BUTTON_TEXTS.includes(el.textContent.trim()))
if (selectButtonSpan) {
// Return the closest clickable container (button or element with role="button")
return selectButtonSpan.closest('[role="button"]') || selectButtonSpan;
}
await delay(500);
}
throw new Error('Select button not found.');
}
// 3. DEDICATED function to find the OK button in an error modal
const findOkButtonInModal = async (timeout) => {
const startTime = Date.now();
while (Date.now() - startTime < timeout) {
// RESILIENT SEARCH: Find ANY button/span with OK text
const okButtonSpan = [...document.querySelectorAll('button, [role="button"], span')]
.find(el => OK_BUTTON_TEXTS.includes(el.textContent.trim()));
if (okButtonSpan) {
// CONFIRM: Ensure the element is inside a dialog
const clickableElement = okButtonSpan.closest('button, [role="button"]') || okButtonSpan;
if (clickableElement.closest('[role="dialog"]')) {
// Found the OK button inside a modal dialog
return clickableElement;
}
}
await delay(500);
}
return null; // Return null if not found within timeout
}
const deleteSelectedComments = async () => {
try {
// Find the delete button by text content
const deleteButtonSpan = [...document.querySelectorAll('span')]
.find(el => DELETE_BUTTON_TEXTS.includes(el.textContent.trim()))
const deleteButton = deleteButtonSpan?.closest('[role="button"]') || deleteButtonSpan
if (!deleteButton) throw new Error('Delete button not found')
await clickElement(deleteButton)
await delay(DELAY_BETWEEN_ACTIONS_MS)
// Confirm button is usually one of the buttons with tabindex="0" after the modal appears
const confirmButton = await waitForElement('button[tabindex="0"]')
await clickElement(confirmButton)
// Execution returns to deleteActivity to wait for error modal OR Select button
} catch (error) {
console.error('Error during batch comment deletion (pre-error check):', error.message)
throw error;
}
}
const scrollAndWaitForMoreComments = async (previousCount) => {
window.scrollTo(0, document.body.scrollHeight)
for (let i = 0; i < 10; i++) {
await delay(1000)
const currentCount = document.querySelectorAll(CHECKBOX_SELECTOR).length
if (currentCount > previousCount) return true
}
return false
}
const deleteActivity = async () => {
try {
while (true) {
console.log('Awaiting next action: Select button or Error modal...')
// 1. Check for a pending Error Modal first, using the robust wait time
const okButton = await findOkButtonInModal(MAX_WAIT_FOR_OK_MODAL_MS);
if (okButton) {
console.warn('⚠️ Detected "Something went wrong" error modal. Clicking OK and waiting 3s.')
await clickElement(okButton)
await delay(DELAY_AFTER_ERROR_DISMISS_MS) // 3 seconds wait after dismissing error
continue // Restart the loop to find the Select button
}
// 2. If no error modal found, wait up to 45 seconds for the Select button
const selectButton = await findSelectButton(MAX_WAIT_FOR_ACTION_MS);
// --- Selection and Deletion ---
await clickElement(selectButton)
// Using the new, shorter delay
await delay(DELAY_AFTER_SELECT_CLICK_MS)
let checkboxes = document.querySelectorAll(CHECKBOX_SELECTOR)
if (checkboxes.length === 0) {
console.log('Trying to scroll for more comments...')
const gotMore = await scrollAndWaitForMoreComments(0)
if (!gotMore) {
console.log('🚫 No more comments to delete.')
break
}
continue
}
await delay(DELAY_AFTER_COMMENTS_VISIBLE_MS)
const commentsToSelect = Math.min(DELETION_BATCH_SIZE, checkboxes.length);
console.log(`Selecting ${commentsToSelect} comments...`)
for (let i = 0; i < commentsToSelect; i++) {
await clickElement(checkboxes[i])
await delay(DELAY_BETWEEN_CHECKBOX_CLICKS_MS)
}
console.log('Deleting selected batch...')
await deleteSelectedComments()
// After deletion, the loop goes back to the start and checks for the modal first,
// then waits for the Select button to reappear on the refreshed page.
}
} catch (error) {
console.error('Fatal Error in deleteActivity loop:', error.message)
}
}
// Start script
try {
await deleteActivity()
console.log('✅ All comments deleted or none left to delete. Script finished.')
} catch (error) {
console.error('FATAL SCRIPT ERROR:', error.message)
}
})()
