UPDATE users
SET nickname = 'yuzuru', display_name = 'yuzuru', updated_at = NOW()
WHERE id = '7cb8e370-1cb4-4794-b0e3-8cde1cd4ae8b'
  AND email = 'reader@polka.local'
  AND nickname = 'mattoy'
  AND display_name = 'Matto Yuzuru'
  AND NOT EXISTS (
      SELECT 1 FROM users
      WHERE LOWER(nickname) = 'yuzuru'
        AND id <> '7cb8e370-1cb4-4794-b0e3-8cde1cd4ae8b'
  );
