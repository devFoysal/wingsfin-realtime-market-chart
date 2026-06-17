export function minuteKey(value: string) {
  const date = new Date(value);
  date.setSeconds(0, 0);
  return date.getTime();
}
