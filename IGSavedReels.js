;(async function () {

  const OPEN_DELAY = 1200       // delay after opening a post
  const UNSAVE_DELAY = 800      // delay after clicking unsave
  const CLOSE_DELAY = 800       // delay after closing the post
  const BETWEEN_POSTS = 500     // delay before opening next post

  const delay = (ms) => new Promise(r => setTimeout(r, ms))

  const posts = [...document.querySelectorAll('article a, a[href*="/p/"], a[href*="/reel/"]')]

  console.log(`Found ${posts.length} saved posts on screen.`)
  console.log("Starting…")

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]

    console.log(`Opening post ${i+1}/${posts.length}`)

    post.scrollIntoView({ behavior: "smooth", block: "center" })
    post.click()

    await delay(OPEN_DELAY)

    // unsave button (bookmark icon)
    const unsaveBtn = document.querySelector('svg[aria-label="Remove"], svg[aria-label="Saved"], svg[aria-label="Unsave"]')

    if (unsaveBtn) {
      unsaveBtn.closest('button, div[role="button"]').click()
      console.log(`Unsave clicked for post ${i+1}`)
    } else {
      console.log(`Could not find unsave button for post ${i+1}`)
    }

    await delay(UNSAVE_DELAY)

    // close modal (X icon or browser back)
    const closeBtn = document.querySelector('svg[aria-label="Close"], svg[aria-label="Fechar"]')

    if (closeBtn) {
      closeBtn.closest('button, div[role="button"]').click()
    } else {
      history.back()
    }

    await delay(CLOSE_DELAY)
    await delay(BETWEEN_POSTS)
  }

  console.log("Done.")

})();
