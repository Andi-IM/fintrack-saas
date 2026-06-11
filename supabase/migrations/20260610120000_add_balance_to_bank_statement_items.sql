ALTER TABLE public.bank_statement_items
ADD COLUMN balance NUMERIC;

COMMENT ON COLUMN public.bank_statement_items.balance IS 'Running balance after this transaction';

-- Backfill existing statement item balances
WITH running_calc AS (
  SELECT 
    i.id,
    s.opening_balance + COALESCE(
      SUM(
        CASE 
          WHEN i2.type = 'income' THEN i2.amount 
          ELSE -i2.amount 
        END
      ), 0
    ) as calculated_balance
  FROM public.bank_statement_items i
  JOIN public.bank_statements s ON i.statement_id = s.id
  LEFT JOIN public.bank_statement_items i2 ON i2.statement_id = i.statement_id 
    AND (i2.date < i.date OR (i2.date = i.date AND i2.id <= i.id))
  GROUP BY i.id, s.opening_balance
)
UPDATE public.bank_statement_items i
SET balance = rc.calculated_balance
FROM running_calc rc
WHERE i.id = rc.id AND i.balance IS NULL;
