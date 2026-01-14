/**
 * Gera uma senha aleatória segura
 * @param length Tamanho da senha (padrão: 12)
 * @returns Senha aleatória
 */
export function generateRandomPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';

  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';

  // Garantir pelo menos um caractere de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Preencher o resto da senha
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Embaralhar a senha para que os primeiros caracteres não sejam sempre previsíveis
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
