document.getElementById('startButton').addEventListener('click', () => {
  const nationsInput = document.getElementById('nationInput').value
  const userAgent = document.getElementById('ua').value
  const password = document.getElementById('pass').value

  const nations = nationsInput
    .split('\n')
    .map(nation => nation.trim())
    .filter(nation => nation.length > 0)

  if (nations.length === 0) {
    alert('Please enter at least one nation')
    return
  }

  browser.runtime.sendMessage({ action: 'setQueue', nations, userAgent, password }, () => {
    if (!window.location.pathname.includes('options.html')) {
      window.close()
    }
  })
})

document.getElementById('stopButton').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: 'stop' })
  if (!window.location.pathname.includes('options.html')) {
    window.close()
  }
})

document.getElementById('clearButton').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: 'clearLinks' })
  if (!window.location.pathname.includes('options.html')) {
    window.close()
  }
})

document.getElementById('startQueue').addEventListener('click', () => {
  browser.runtime.sendMessage({ action: 'startNavigation' })
  if (!window.location.pathname.includes('options.html')) {
    window.close()
  }
})

document.getElementById('optionsButton').addEventListener('click', () => {
  browser.runtime.openOptionsPage()
})

if (window.location.pathname.includes('options.html')) {
  const optionsButton = document.getElementById('optionsButton')
  if (optionsButton) {
    optionsButton.style.display = 'none'
  }
}

browser.runtime.onMessage.addListener(message => {
  if (message.action === 'updateProgress') {
    const { progress } = message

    document.querySelector('pre').innerHTML = progress
  }
  if (message.action === 'scriptStarted') {
    const { running } = message

    // document.querySelector('#clearButton').disabled = !running
    document.querySelector('#stopButton').disabled = !running
  }
  if (message.action === 'queueEmpty') {
    document.querySelector('#startQueue').disabled = true
  }
  if (message.action === 'queueHasLink') {
    document.querySelector('#startQueue').disabled = false
  }
})
