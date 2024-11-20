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

document.getElementById('optionsButton').addEventListener('click', () => {
  browser.runtime.openOptionsPage()
})

if (window.location.pathname.includes('options.html')) {
  const optionsButton = document.getElementById('optionsButton')
  if (optionsButton) {
    optionsButton.style.display = 'none'
  }
}
