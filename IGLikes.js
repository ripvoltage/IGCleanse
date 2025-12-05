;(async function () {
const DELETION_BATCH_SIZE = 20
const DELAY_BETWEEN_ACTIONS_MS = 1500
const DELAY_BETWEEN_CHECKBOX_CLICKS_MS = 300
// Delays:
const DELAY_AFTER_SELECT_CLICK_MS = 2000
const DELAY_AFTER_COMMENTS_VISIBLE_MS = 2000
// Error Handling Delays:
const DELAY_AFTER_ERROR_DISMISS_MS = 3000
const MAX_WAIT_FOR_ACTION_MS = 45000
const MAX_WAIT_FOR_OK_MODAL_MS = 15000
const MAX_RETRIES = 90
// CRITICAL CHANGE: Added 'Unlike' and 'Zurücknehmen' to the deletion texts.
const DELETE_BUTTON_TEXTS = ['Delete', 'Löschen', 'Unlike', 'Zurücknehmen']
const SELECT_BUTTON_TEXTS = ['Select', 'Auswählen']
const OK_BUTTON_TEXTS = ['OK', 'Okay', 'Aceptar']
// *** LIKES ITEM SELECTOR ***
const CHECKBOX_SELECTOR = '[aria-label="Toggle checkbox"]'
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
// --- Utility Functions ---
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
// --- Dedicated Button Finders ---
const findSelectButton = async (timeout = MAX_WAIT_FOR_ACTION_MS) => {
const startTime = Date.now();
while (Date.now() - startTime < timeout) {
const selectButtonSpan = [...document.querySelectorAll('span')]
.find(el => SELECT_BUTTON_TEXTS.includes(el.textContent.trim()))
if (selectButtonSpan) {
return selectButtonSpan.closest('[role="button"]') || selectButtonSpan;
}
await delay(500);
}
throw new Error('Select button not found.');
}
const findOkButtonInModal = async (timeout) => {
const startTime = Date.now();
while (Date.now() - startTime < timeout) {
const okButtonSpan = [...document.querySelectorAll('button, [role="button"], span')]
.find(el => OK_BUTTON_TEXTS.includes(el.textContent.trim()));
if (okButtonSpan) {
const clickableElement = okButtonSpan.closest('button, [role="button"]') || okButtonSpan;
if (clickableElement.closest('[role="dialog"]')) {
return clickableElement;
}
}
await delay(500);
}
return null;
}
// --- Core Logic Functions ---
const deleteSelectedLikes = async () => {
try {
// Find the DELETE/UNLIKE button by text content
const deleteButtonSpan = [...document.querySelectorAll('span')]
.find(el => DELETE_BUTTON_TEXTS.includes(el.textContent.trim()))
const deleteButton = deleteButtonSpan?.closest('[role="button"]') || deleteButtonSpan
if (!deleteButton) throw new Error('Delete button not found')
await clickElement(deleteButton)
await delay(DELAY_BETWEEN_ACTIONS_MS)
// Confirm button in the modal
// NOTE: For 'Unlike', there might be a second confirmation modal. We look for a button with tabindex="0".
const confirmButton = await waitForElement('button[tabindex="0"]')
await clickElement(confirmButton)
} catch (error) {
console.error('Error during batch Likes deletion (pre-error check):', error.message)
throw error;
}
}
const scrollAndWaitForMoreLikes = async (previousCount) => {
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
// 1. Check for a pending Error Modal first
const okButton = await findOkButtonInModal(MAX_WAIT_FOR_OK_MODAL_MS);
if (okButton) {
console.warn('⚠️ Detected "Something went wrong" error modal. Clicking OK and waiting 3s.')
await clickElement(okButton)
await delay(DELAY_AFTER_ERROR_DISMISS_MS) // 3 seconds wait
continue // Restart the loop
}
// 2. If no error modal found, wait for the Select button
const selectButton = await findSelectButton(MAX_WAIT_FOR_ACTION_MS);
// --- Selection and Deletion ---
await clickElement(selectButton)
await delay(DELAY_AFTER_SELECT_CLICK_MS) // 2 seconds delay
let checkboxes = document.querySelectorAll(CHECKBOX_SELECTOR)
if (checkboxes.length === 0) {
console.log('Trying to scroll for more Likes...')
const gotMore = await scrollAndWaitForMoreLikes(0)
if (!gotMore) {
console.log('🚫 No more Likes to delete.')
break
}
continue
}
await delay(DELAY_AFTER_COMMENTS_VISIBLE_MS)
const itemsToSelect = Math.min(DELETION_BATCH_SIZE, checkboxes.length);
console.log(`Selecting ${itemsToSelect} Likes...`)
for (let i = 0; i < itemsToSelect; i++) {
await clickElement(checkboxes[i])
await delay(DELAY_BETWEEN_CHECKBOX_CLICKS_MS)
}
console.log('Deleting selected batch of Likes...')
await deleteSelectedLikes()
// Loop restarts to check for modal/select button
}
} catch (error) {
console.error('Fatal Error in deleteActivity loop:', error.message)
}
}
// Start script
try {
await deleteActivity()
console.log('You unlikeable stud, no likes found')
} catch (error) {
console.error('FATAL SCRIPT ERROR:', error.message)
}
})()
