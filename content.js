document.addEventListener('keydown', function handleKeyPress(event) {
  if (event.key === 'Enter') {
    document.removeEventListener('keydown', handleKeyPress)
    browser.runtime.sendMessage({ action: 'nextLink' })
  }
})
