/**
 * Test file with emojis to verify UTF-8 support
 * Archivo de prueba con emojis para verificar soporte UTF-8
 */

// Emojis varios: 📄 🧬 ⚠️ ✅ ❌ 🗑️ 📝 🪦
export function testEmojis() {
  const emojis = {
    file: '📄',
    dna: '🧬',
    warning: '⚠️',
    check: '✅',
    cross: '❌',
    trash: '🗑️',
    pencil: '📝',
    tombstone: '🪦'
  };
  
  console.log('Testing emoji support:', emojis);
  return emojis;
}

// Texto con tildes: á é í ó ú ñ
export function testAccents() {
  const text = 'á é í ó ú ñ Á É Í Ó Ú Ñ';
  console.log('Testing accents:', text);
  return text;
}

// Caracteres especiales: → ← ↑ ↓ • · × ÷ © ® ™
export function testSpecialChars() {
  const chars = '→ ← ↑ ↓ • · × ÷ © ® ™ € £ ¥ § ¶ † ‡';
  console.log('Testing special chars:', chars);
  return chars;
}

export default {
  testEmojis,
  testAccents,
  testSpecialChars
};
