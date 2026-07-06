// Custom storage adapter implementing read, write, and delete interface
const storageAdapter = {
  read: (key) => {
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return null
    }
  },

  write: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error('Error writing to localStorage:', error)
    }
  },

  delete: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Error deleting from localStorage:', error)
    }
  }
}

export default storageAdapter
