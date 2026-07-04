# Zarządzanie zadaniami w trybie offline z synchronizacją z chmurą

## Dlaczego to zadanie
Użytkownik do tej pory nie pracował z aplikacjami desktopowymi ani z lokalnymi bazami danych. To zadanie wprowadzi go w świat tworzenia aplikacji offline z możliwością późniejszej synchronizacji z chmurą, co jest nowym podejściem w jego dotychczasowej pracy.

## Instrukcja
Zbuduj aplikację desktopową do zarządzania zadaniami, która będzie działać offline i synchronizować dane z lokalną bazą SQLite. Podziel projekt na następujące moduły: 1. Interfejs użytkownika: użyj frameworka Electron, aby utworzyć prosty interfejs do dodawania, edytowania i usuwania zadań. 2. Logika biznesowa: stwórz moduł, który będzie zarządzał dodawaniem, usuwaniem i aktualizowaniem zadań w bazie danych. 3. Baza danych: użyj SQLite do przechowywania zadań lokalnie. 4. Synchronizacja: zaimplementuj możliwość eksportowania zadań do pliku JSON oraz importowania zadań z pliku JSON, co umożliwi synchronizację z chmurą. 5. Obsługa błędów: zadbaj o odpowiednie komunikaty błędów dla użytkowników oraz walidację danych wejściowych. 6. Testy: stwórz testy jednostkowe dla logiki biznesowej oraz modułu synchronizacji. Zadbaj o wyraźny podział na warstwy i sensowną strukturę projektu.

## Dodaj coś od siebie
Rozbuduj aplikację o możliwość synchronizacji z zewnętrznym API, które będzie przechowywać zadania w chmurze, na przykład użyj Firebase lub innego prostego API do przechowywania danych.

## README (wymagane)
W repozytorium utwórz plik `README.md` napisany **po angielsku**, opisujący projekt:
co to jest, jak go uruchomić oraz czego użyto (języki, biblioteki, narzędzia).
To wymóg obowiązkowy dla każdego questa.

## Kryteria zaliczenia
- [ ] Interfejs użytkownika z funkcjami dodawania, edytowania i usuwania zadań.
- [ ] Lokalna baza danych SQLite do przechowywania zadań.
- [ ] Moduł synchronizacji z plikami JSON do importu i eksportu zadań.
- [ ] Obsługa błędów z odpowiednimi komunikatami dla użytkownika.
- [ ] Testy jednostkowe dla logiki biznesowej.
- [ ] Dokumentacja projektu z opisem architektury i sposobu uruchomienia aplikacji.
- [ ] Repozytorium zawiera plik README.md napisany po angielsku

---
*Wygenerowane automatycznie przez NERD - NewEveryRepoDay.*
