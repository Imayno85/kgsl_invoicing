interface AppProps {
    amount: number;
    currency: "UGX" | "USD";
    locale?: string; // Optional locale parameter for flexibility
}

export function formatCurrency({ amount, currency, locale = "en-UG" }: AppProps): string {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
    }).format(amount);
}

// For Debugging
// console.log(formatCurrency({ amount: 1000, currency: "UGX" })); // UGX 1,000.00
// console.log(formatCurrency({ amount: 1000, currency: "USD", locale: "en-US" })); // $1,000.00
