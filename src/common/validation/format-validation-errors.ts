import { ValidationError } from 'class-validator';
import { validationMessages } from './validation-messages';

const DEFAULT_MESSAGE_TRANSLATIONS: Array<[RegExp, string]> = [
  [/^property (.+) should not exist$/, 'Campo não permitido na requisição'],
  [/^(.+) should not be empty$/, 'Preencha este campo'],
  [/^(.+) must be a string$/, 'Este campo deve ser um texto'],
  [/^(.+) must be a boolean value$/, 'Este campo deve ser verdadeiro ou falso'],
  [/^(.+) must be a number conforming to the specified constraints$/, 'Informe um número válido'],
  [/^(.+) must be an email$/, 'Informe um e-mail válido'],
  [/^(.+) must be one of the following values:/, 'Selecione um valor válido'],
];

function translateDefaultMessage(message: string): string {
  for (const [pattern, replacement] of DEFAULT_MESSAGE_TRANSLATIONS) {
    if (pattern.test(message)) {
      return replacement;
    }
  }

  return message;
}

export function formatValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        messages.push(translateDefaultMessage(message));
      }
    }

    if (error.children?.length) {
      messages.push(...formatValidationErrors(error.children));
    }
  }

  if (!messages.length) {
    return [validationMessages.nested()];
  }

  return messages;
}
