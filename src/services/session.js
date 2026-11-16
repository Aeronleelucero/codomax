import { removeItem } from '../utils/storage';

// Authentication is held by the server and an HttpOnly cookie. Remove old
// browser tokens and data from earlier versions without retaining any user data.
export function removeLegacyMockData() {
  ['artikly.auth', 'artikly.session', 'artikly.users', 'artikly.blogs'].forEach(removeItem);
}
