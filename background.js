let linkQueue = []
let isNavigating = false
let currentTabId = null

browser.runtime.onMessage.addListener(async message => {
  if (message.action === 'setQueue') {
    browser.browserAction.setBadgeText({ text: '' })
    linkQueue = []
    isNavigating = false

    for (let i = 0; i < message.nations.length; i++) {
      const response = await fetch(
        `https://www.nationstates.net/cgi-bin/api.cgi?nation=${message.nations[i]
          .replaceAll(' ', '_')
          .toLowerCase()}&q=issues`,
        {
          headers: {
            'User-Agent': message.userAgent,
            'X-Password': message.password,
          },
        }
      )

      const text = await response.text()
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(text, 'application/xml')

      const issues = Array.from(xmlDoc.querySelectorAll('ISSUE'))
      let issueIds = issues.map(issue => issue.getAttribute('id'))

      if (!Array.isArray(issues) || issues.length === 0) {
        issueIds = []
      }

      const nation_formatted = message.nations[i].replaceAll(' ', '_').toLowerCase()
      for (let i = 0; i < Math.min(issueIds.length, 500); i++) {
        const issueId = issueIds[i]
        linkQueue.push(
          `https://www.nationstates.net/container=${nation_formatted}/nation=${nation_formatted}/page=show_dilemma/dilemma=${issueId}/template-overall=none?generated_by=Test_Extension__author_main_nation_Kractero__usedBy_${message.userAgent}`
        )
      }

      browser.browserAction.setBadgeText({ text: (i + 1).toString() })

      if (linkQueue.length > 0 && !isNavigating) {
        isNavigating = true
        startNavigation()
      }

      await new Promise(resolve => setTimeout(resolve, 600))
    }
  }
})

async function startNavigation() {
  if (linkQueue.length === 0) {
    isNavigating = false
    return
  }

  try {
    const newTab = await browser.tabs.create({ url: 'about:blank', active: true })
    currentTabId = newTab.id
    await navigateToNext()
  } catch (error) {
    console.error('Error starting navigation:', error)
    isNavigating = false
  }
}

async function navigateToNext() {
  if (linkQueue.length === 0) {
    isNavigating = false
    return
  }

  const nextLink = linkQueue.shift()

  try {
    await browser.tabs.update(currentTabId, { url: nextLink })

    const onTabUpdated = async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url.includes('enact_dilemma')) {
        console.log(`Matched URL: ${tab.url}`)

        await browser.tabs.executeScript(currentTabId, { file: 'content.js' })

        browser.tabs.onUpdated.removeListener(onTabUpdated)
      }
    }

    const onTabCreated = tab => {
      console.log('New tab created:', tab.id, tab.url)
      currentTabId = tab.id

      if (tab.url && tab.url.includes('enact_dilemma')) {
        browser.tabs.executeScript(tab.id, { file: 'content.js' })
      }
    }

    browser.tabs.onUpdated.addListener(onTabUpdated)
    browser.tabs.onCreated.addListener(onTabCreated)
  } catch (error) {
    console.error('Error navigating to next link:', error)
    isNavigating = false
  }
}

browser.runtime.onMessage.addListener(message => {
  if (message.action === 'nextLink' && isNavigating) {
    navigateToNext()
  }
})
