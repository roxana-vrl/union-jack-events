MODEL DE PRET

In tabelul packages, base_price reprezinta pretul per invitat (RON), NU pretul fix per eveniment.
In tabelul services, price reprezinta pretul FIX per eveniment (RON).
Clientul vede totalul estimat: invitati x base_price + suma serviciilor selectate.
Lasati pretul NULL pentru oferte la cerere.

ATENTIE: serviciile sunt inca transmise in notes, nu in booking_services. Pentru productie trebuie o functie RPC tranzactionala care salveaza si ID-urile serviciilor, validand preturile pe server.
Nu folositi estimarea din browser drept pret contractual.
