const { Markup } = require('telegraf');

const superAdminKeyboard = Markup.keyboard([
  ['📢 Post', '📊 Statistika'],
  ['➕ Admin qo\'shish', '➖ Admin o\'chirish'],
  ['➕ Kanal qo\'shish', '➖ Kanal o\'chirish'],
  ['🗑 Kino o\'chirish']
]).resize();

const adminKeyboard = Markup.keyboard([
  ['📢 Post', '📊 Statistika']
]).resize();

const userKeyboard = Markup.removeKeyboard();

module.exports = { superAdminKeyboard, adminKeyboard, userKeyboard };
