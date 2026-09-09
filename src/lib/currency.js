// Every price in the UI goes through here, so switching currency or grouping is
// a one-line change rather than a hunt through the components.
//
// en-IN groups by lakh (₹1,23,456 rather than ₹123,456) and prices are whole
// rupees — paise are not shown in Indian retail.
const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

/** Formats an amount in rupees for display, e.g. 3499 → "₹3,499". */
export const formatPrice = (amount) => rupees.format(Math.round(amount ?? 0))
