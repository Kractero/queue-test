let linkQueue = []
let isNavigating = false
let currentTabId = null
let stopped = false

browser.runtime.onMessage.addListener(async message => {
  if (message.action === 'clearLinks') {
    browser.browserAction.setBadgeText({ text: '' })
    linkQueue = []
    isNavigating = false
    stopped = true
  }
  if (message.action === 'stop') {
    stopped = true
  }
  if (message.action === 'startNavigation') {
    if (!isNavigating) {
      isNavigating = true
      startNavigation()
    }
  }
  if (message.action === 'setQueue') {
    browser.runtime.sendMessage({
      action: 'scriptStarted',
      running: true,
    })
    browser.browserAction.setBadgeText({ text: '' })
    linkQueue = []
    isNavigating = false
    let progress = ''
    stopped = false

    for (let i = 0; i < message.nations.length; i++) {
      if (stopped) {
        progress += `<p class="text-red-500">Processing stopped by user.</p>`
        browser.runtime.sendMessage({
          action: 'updateProgress',
          progress: progress,
        })
        break
      }
      progress += `<p>Processing nation: ${message.nations[i]} (${i + 1}/${message.nations.length})</p>`
      browser.runtime.sendMessage({
        action: 'updateProgress',
        progress: progress,
      })
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
        browser.runtime.sendMessage({ action: 'queueHasLink' })
      }

      browser.browserAction.setBadgeText({ text: (message.nations.length - (i + 1)).toString() })

      await new Promise(resolve => setTimeout(resolve, 600))
    }
    progress += `<p class="text-green-500">Finished processing ${message.nations.length} nations!</p>`
    browser.runtime.sendMessage({
      action: 'updateProgress',
      progress: progress,
    })
    browser.runtime.sendMessage({
      action: 'scriptStarted',
      progress: false,
    })
  }
})

async function startNavigation() {
  if (linkQueue.length === 0) {
    isNavigating = false
    browser.runtime.sendMessage({ action: 'queueEmpty' })
    return
  }

  try {
    const newTab = await browser.tabs.create({ url: 'about:blank', active: true })
    currentTabId = newTab.id

    const onTabRemoved = tabId => {
      if (tabId === currentTabId) {
        console.log(`Tab ${tabId} closed. Adding link back to queue.`)
        if (linkQueue.length > 0 && !isNavigating) {
          linkQueue.unshift(`https://www.nationstates.net${currentTabId}`) // Restore the failed navigation
        }

        isNavigating = false
        currentTabId = null
        browser.tabs.onRemoved.removeListener(onTabRemoved)
      }
    }
    browser.tabs.onRemoved.addListener(onTabRemoved)
    await navigateToNext()
  } catch (error) {
    console.error('Error starting navigation:', error)
    isNavigating = false
  }
}

async function navigateToNext() {
  if (linkQueue.length === 0) {
    isNavigating = false
    browser.runtime.sendMessage({ action: 'queueEmpty' })
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
