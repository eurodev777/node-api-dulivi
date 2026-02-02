// utils/date.js
export const timestampToDate = (ts) => {
	if (!ts) return null
	const num = Number(ts)
	if (isNaN(num)) return null
	return new Date(num)
}
