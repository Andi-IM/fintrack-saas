CREATE OR REPLACE FUNCTION pg_temp.convert_statement_period_to_date(
  period_text text,
  created_at_value timestamp with time zone
)
RETURNS date
LANGUAGE plpgsql
AS $$
DECLARE
  clean_period text;
  month_text text;
  year_text text;
  month_num integer;
BEGIN
  clean_period := trim(
    CASE
      WHEN period_text LIKE '%-%' THEN split_part(period_text, '-', 2)
      ELSE period_text
    END
  );

  IF clean_period IS NOT NULL AND clean_period ~* '^[[:alpha:]]{3,9}\s+\d{4}$' THEN
    month_text := upper(split_part(clean_period, ' ', 1));
    year_text := split_part(clean_period, ' ', 2);
    month_num := CASE month_text
      WHEN 'JAN' THEN 1
      WHEN 'FEB' THEN 2
      WHEN 'MAR' THEN 3
      WHEN 'APR' THEN 4
      WHEN 'MAY' THEN 5
      WHEN 'MEI' THEN 5
      WHEN 'JUN' THEN 6
      WHEN 'JUL' THEN 7
      WHEN 'AUG' THEN 8
      WHEN 'AGU' THEN 8
      WHEN 'AGT' THEN 8
      WHEN 'AGS' THEN 8
      WHEN 'SEP' THEN 9
      WHEN 'OCT' THEN 10
      WHEN 'OKT' THEN 10
      WHEN 'NOV' THEN 11
      WHEN 'NOP' THEN 11
      WHEN 'DEC' THEN 12
      WHEN 'DES' THEN 12
      ELSE NULL
    END;

    IF month_num IS NOT NULL AND year_text ~ '^\d{4}$' THEN
      RETURN make_date(year_text::integer, month_num, 1);
    END IF;
  END IF;

  RETURN COALESCE(created_at_value::date, CURRENT_DATE);
END;
$$;

ALTER TABLE public.bank_statements
ALTER COLUMN statement_period TYPE date
USING pg_temp.convert_statement_period_to_date(statement_period, created_at);

ALTER TABLE public.bank_statements
ALTER COLUMN statement_period SET NOT NULL;
