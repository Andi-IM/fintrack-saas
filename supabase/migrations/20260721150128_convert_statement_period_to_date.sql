ALTER TABLE public.bank_statements
ALTER COLUMN statement_period TYPE date
USING (
  CASE upper(split_part(statement_period, ' ', 1))
    WHEN 'JAN' THEN make_date(split_part(statement_period, ' ', 2)::integer, 1, 1)
    WHEN 'FEB' THEN make_date(split_part(statement_period, ' ', 2)::integer, 2, 1)
    WHEN 'MAR' THEN make_date(split_part(statement_period, ' ', 2)::integer, 3, 1)
    WHEN 'APR' THEN make_date(split_part(statement_period, ' ', 2)::integer, 4, 1)
    WHEN 'MAY' THEN make_date(split_part(statement_period, ' ', 2)::integer, 5, 1)
    WHEN 'MEI' THEN make_date(split_part(statement_period, ' ', 2)::integer, 5, 1)
    WHEN 'JUN' THEN make_date(split_part(statement_period, ' ', 2)::integer, 6, 1)
    WHEN 'JUL' THEN make_date(split_part(statement_period, ' ', 2)::integer, 7, 1)
    WHEN 'AUG' THEN make_date(split_part(statement_period, ' ', 2)::integer, 8, 1)
    WHEN 'AGU' THEN make_date(split_part(statement_period, ' ', 2)::integer, 8, 1)
    WHEN 'AGT' THEN make_date(split_part(statement_period, ' ', 2)::integer, 8, 1)
    WHEN 'AGS' THEN make_date(split_part(statement_period, ' ', 2)::integer, 8, 1)
    WHEN 'SEP' THEN make_date(split_part(statement_period, ' ', 2)::integer, 9, 1)
    WHEN 'OCT' THEN make_date(split_part(statement_period, ' ', 2)::integer, 10, 1)
    WHEN 'OKT' THEN make_date(split_part(statement_period, ' ', 2)::integer, 10, 1)
    WHEN 'NOV' THEN make_date(split_part(statement_period, ' ', 2)::integer, 11, 1)
    WHEN 'NOP' THEN make_date(split_part(statement_period, ' ', 2)::integer, 11, 1)
    WHEN 'DEC' THEN make_date(split_part(statement_period, ' ', 2)::integer, 12, 1)
    WHEN 'DES' THEN make_date(split_part(statement_period, ' ', 2)::integer, 12, 1)
  END
);

ALTER TABLE public.bank_statements
ALTER COLUMN statement_period SET NOT NULL;
