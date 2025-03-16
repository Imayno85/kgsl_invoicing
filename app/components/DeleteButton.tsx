'use client';

import { deleteReceipt } from "@/app/actions";

export function DeleteButton({ receiptId }: { receiptId: string }) {
  return (
    <form action={deleteReceipt.bind(null, receiptId)}>
      <button
        type="submit"
        className="text-red-600 hover:text-red-900 font-medium"
        onClick={(e) => {
          if (
            !confirm(
              "Are you sure you want to delete this receipt?"
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}