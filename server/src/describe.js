// Builds a one-line description of a card for notifications, skipping empty fields:
// "2023 Bowman Chrome Joshua Baez Purple Refractor 12/75"
export function describeCard(card) {
  return [card.year, card.brand, card.set_name, card.player, card.card_number && `#${card.card_number}`, card.parallel, card.serial_number, card.grade]
    .filter(Boolean)
    .join(' ');
}
