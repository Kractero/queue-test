document.getElementById('ua').value = localStorage.getItem('ua') || ''
document.getElementById('nationInput').value = localStorage.getItem('nationInput') || ''
document.getElementById('settingsForm').addEventListener('submit', function (event) {
  event.preventDefault()
  const ua = document.getElementById('ua').value
  const nationInput = document.getElementById('nationInput').value

  localStorage.setItem('ua', ua)
  localStorage.setItem('nationInput', nationInput)

  console.log('Settings saved:', ua, nationInput)
})
