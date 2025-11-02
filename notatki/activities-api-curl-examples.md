# Przykładowe komendy curl do testowania endpointu aktywności

## Podstawowe GET - lista aktywności

```bash
# Podstawowe zapytanie (domyślnie limit=20)
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities" \
  -H "Content-Type: application/json" \
  -v

# Z limitem
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=20" \
  -H "Content-Type: application/json" \
  -v

# Z limitem i filtrem statusu
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=20&status=draft" \
  -H "Content-Type: application/json" \
  -v

# Z wyszukiwaniem
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=20&search=test" \
  -H "Content-Type: application/json" \
  -v

# Z filtrem przypisanych do mnie
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=20&assigned=me" \
  -H "Content-Type: application/json" \
  -v

# Tylko usunięte aktywności
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=20&deleted=only" \
  -H "Content-Type: application/json" \
  -v

# Z kursorem (paginacja)
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=20&cursor=<cursor_from_previous_response>" \
  -H "Content-Type: application/json" \
  -v
```

## Z formatowaniem JSON (jq)

```bash
# Ładnie sformatowana odpowiedź
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=20" \
  -H "Content-Type: application/json" \
  -s | jq .

# Tylko dane (bez metadanych)
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=20" \
  -H "Content-Type: application/json" \
  -s | jq '.data'

# Liczba aktywności
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=20" \
  -H "Content-Type: application/json" \
  -s | jq '.data | length'

# Tylko tytuły aktywności
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=20" \
  -H "Content-Type: application/json" \
  -s | jq '.data[].title'
```

## Zapisywanie odpowiedzi do pliku

```bash
# Zapisz odpowiedź do pliku
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=20" \
  -H "Content-Type: application/json" \
  -o response.json

# Zapisz z formatowaniem
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=20" \
  -H "Content-Type: application/json" \
  -s | jq . > response.json
```

## Sprawdzanie błędów

```bash
# Nieprawidłowy UUID grupy
curl -X GET "http://localhost:3000/api/groups/invalid-uuid/activities" \
  -H "Content-Type: application/json" \
  -v

# Nieprawidłowy parametr
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?limit=invalid" \
  -H "Content-Type: application/json" \
  -v

# Nieprawidłowy status
curl -X GET "http://localhost:3000/api/groups/b12b5eef-70d0-427a-88c1-aed3cd8cc0b5/activities?status=invalid_status" \
  -H "Content-Type: application/json" \
  -v
```

## Uwagi

1. **Autoryzacja**: W trybie deweloperskim middleware automatycznie ustawia `DEFAULT_USER_ID`, więc nie potrzeba nagłówka `Authorization`
2. **Content-Type**: Wysyłanie nagłówka `Content-Type: application/json` jest opcjonalne dla GET, ale dobry nawyk
3. **Query params**: Wszystkie parametry są opcjonalne:
   - `limit` - liczba wyników (domyślnie 20)
   - `status` - filtr po statusie (draft|review|ready|archived)
   - `assigned` - filtr "me" dla przypisanych aktywności
   - `search` - wyszukiwanie w tytule i objective
   - `deleted` - "only" dla tylko usuniętych
   - `cursor` - kursora dla paginacji

## Przykładowa odpowiedź sukcesu

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Nazwa aktywności",
      "objective": "Cel",
      "status": "draft",
      "group_id": "b12b5eef-70d0-427a-88c1-aed3cd8cc0b5",
      "editors": [],
      ...
    }
  ],
  "nextCursor": "encoded_cursor_string"
}
```

## Przykładowa odpowiedź błędu

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "User is not a member of this group",
    "details": {}
  }
}
```

