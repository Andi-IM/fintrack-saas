CREATE OR REPLACE FUNCTION pg_temp.convert_statement_period_to_date(
  period_text text,
  created_at_value timestamp with time zone
)
RETURNS date
LANGUAGE plpgsql
AS $$
DECLARE
  period_match text[];
  month_text text;
  year_text text;
  month_num integer;
BEGIN
  SELECT match
  INTO period_match
  FROM regexp_matches(
    COALESCE(period_text, ''),
    '\m(jan|feb|mar|apr|mei|jun|jul|agu|agt|ags|sep|okt|nov|des|januari|februari|maret|april|juni|juli|agustus|september|oktober|november|desember|may|aug|oct|dec|january|february|march|june|july|august|october|december)\M,?\s+(\d{4})',
    'gi'
  ) WITH ORDINALITY AS matches(match, ord)
  ORDER BY ord DESC
  LIMIT 1;

  IF period_match IS NOT NULL THEN
    month_text := upper(period_match[1]);
    year_text := period_match[2];
    month_num := CASE month_text
      WHEN 'JAN' THEN 1
      WHEN 'JANUARI' THEN 1
      WHEN 'JANUARY' THEN 1
      WHEN 'FEB' THEN 2
      WHEN 'FEBRUARI' THEN 2
      WHEN 'FEBRUARY' THEN 2
      WHEN 'MAR' THEN 3
      WHEN 'MARET' THEN 3
      WHEN 'MARCH' THEN 3
      WHEN 'APR' THEN 4
      WHEN 'APRIL' THEN 4
      WHEN 'MAY' THEN 5
      WHEN 'MEI' THEN 5
      WHEN 'JUN' THEN 6
      WHEN 'JUNI' THEN 6
      WHEN 'JUNE' THEN 6
      WHEN 'JUL' THEN 7
      WHEN 'JULI' THEN 7
      WHEN 'JULY' THEN 7
      WHEN 'AUG' THEN 8
      WHEN 'AGU' THEN 8
      WHEN 'AGT' THEN 8
      WHEN 'AGS' THEN 8
      WHEN 'AGUSTUS' THEN 8
      WHEN 'AUGUST' THEN 8
      WHEN 'SEP' THEN 9
      WHEN 'SEPTEMBER' THEN 9
      WHEN 'OCT' THEN 10
      WHEN 'OKT' THEN 10
      WHEN 'OKTOBER' THEN 10
      WHEN 'OCTOBER' THEN 10
      WHEN 'NOV' THEN 11
      WHEN 'NOP' THEN 11
      WHEN 'NOVEMBER' THEN 11
      WHEN 'DEC' THEN 12
      WHEN 'DES' THEN 12
      WHEN 'DESEMBER' THEN 12
      WHEN 'DECEMBER' THEN 12
      ELSE NULL
    END;

    IF month_num IS NOT NULL AND year_text ~ '^\d{4}$' THEN
      RETURN make_date(year_text::integer, month_num, 1);
    END IF;
  END IF;

  RETURN date_trunc('month', COALESCE(created_at_value, CURRENT_DATE::timestamp with time zone))::date;
END;
$$;

ALTER TABLE public.bank_statements
ALTER COLUMN statement_period TYPE date
USING pg_temp.convert_statement_period_to_date(statement_period, created_at);

ALTER TABLE public.bank_statements
ALTER COLUMN statement_period SET NOT NULL;
