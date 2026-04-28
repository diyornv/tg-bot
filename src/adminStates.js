// Adminlarning uzoq kutilayotgan harakatlarini saqlash uchun
const adminStates = new Map();

function setAdminState(userId, state) {
  adminStates.set(userId, state);
}

function getAdminState(userId) {
  return adminStates.get(userId);
}

function clearAdminState(userId) {
  adminStates.delete(userId);
}

module.exports = { adminStates, setAdminState, getAdminState, clearAdminState };
