export const formatTimestamp = (value: string) => {
  const date = new Date(value)
  const datePart = date.toLocaleDateString()
  const timePart = date.toLocaleTimeString()
  return `${datePart}
${timePart}`
}
