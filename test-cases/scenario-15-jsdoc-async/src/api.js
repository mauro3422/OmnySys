/**
 * Fetches user data from API
 * @param {string} userId - The user ID to fetch
 * @param {Object} options - Fetch options
 * @param {boolean} options.includePosts - Include user posts
 * @returns {Promise<User>} The user object
 * @throws {Error} If user not found (404)
 * @throws {NetworkError} If request fails
 * @deprecated Use fetchUserV2 instead
 */
async function fetchUser(userId, options = {}) {
  if (!userId) {
    throw new Error('userId is required');
  }
  
  try {
    const response = await fetch(`/api/users/${userId}`);
    
    if (response.status === 404) {
      throw new Error('User not found');
    }
    
    return await response.json();
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('Network error');
    }
    throw error;
  }
}

// Development only logging
if (__DEV__) {
  console.log('API module loaded');
}

export { fetchUser };
