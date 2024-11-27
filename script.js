const clientId = "2a1d7d4e43384a1f813a74df83845b5c"; // Reemplaza con tu Client ID
const redirectUri = "https://army-borahae.github.io/for-army.com/"; // URI configurada en Spotify Dashboard

let accessToken = null;
let expiresIn = null;
let expirationTime = null;

// Scopes solicitados
const scopes = 'user-read-private playlist-modify-public playlist-modify-private user-library-read playlist-read-private';
const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

// Función para redirigir a Spotify para autorización
function authorizeSpotify() {
    window.location.href = authUrl;
}

// Obtener token desde la URL
function getAccessTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    expiresIn = params.get('expires_in'); // Tiempo de expiración del token

    if (token) {
        accessToken = token; // Guardar el token en una variable global
        expirationTime = Date.now() + expiresIn * 1000; // Guardar el tiempo de expiración
        window.history.pushState("", document.title, window.location.pathname); // Limpiar la URL
        console.log("Nuevo token de acceso obtenido:", accessToken);
    }
}

// Verificar si el token ha expirado
function checkAccessToken() {
    if (!accessToken || Date.now() >= expirationTime) {
        authorizeSpotify(); // Redirige a autorización si el token no es válido
    }
}

// Función genérica para manejar solicitudes con token
async function fetchWithTokenRetry(url, options) {
    checkAccessToken(); // Asegura que el token sea válido antes de realizar la solicitud

    try {
        const response = await fetch(url, options);
        if (response.status === 401) { // Token expirado
            console.log("Token expirado. Redirigiendo a autorización...");
            authorizeSpotify(); // Redirige automáticamente
        }
        return response;
    } catch (error) {
        console.error("Error en la solicitud:", error);
        throw error;
    }
}

// Obtener el token al cargar la página
if (window.location.hash) {
    getAccessTokenFromUrl();
} else {
    authorizeSpotify(); // Redirige automáticamente si no hay token
}

// Función para mostrar las notificaciones en pantalla
function showNotification(message) {
    const notification = document.getElementById("notification");
    const notificationText = document.getElementById("notification-text");

    notificationText.textContent = message; // Establecer el mensaje
    notification.style.display = "block"; // Mostrar la notificación
    notification.classList.add("show");

    setTimeout(() => { // Ocultar después de 3 segundos
        notification.classList.remove("show");
        notification.style.display = "none";
    }, 3000);
}

// Buscar canciones
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const results = document.getElementById("results");
const playlist = document.getElementById("playlist");

const selectedTracks = []; // Asegúrate de que sea un arreglo global

searchBtn.addEventListener("click", async () => {
    const query = searchInput.value;
    if (!query) return showNotification("Por favor, ingresa una búsqueda.");

    try {
        const response = await fetchWithTokenRetry(
            `https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error("No se pudo obtener los resultados de búsqueda.");
        }

        const data = await response.json();
        if (!data.tracks || !data.tracks.items || data.tracks.items.length === 0) {
            showNotification("No se encontraron resultados.");
            return;
        }

        results.innerHTML = "";
        data.tracks.items.forEach((track) => {
            const li = document.createElement("li");

            const img = document.createElement("img");
            img.src = track.album.images[0].url;
            img.alt = track.name;
            img.classList.add("track-image");

            const text = document.createElement("span");
            text.textContent = `${track.name} - ${track.artists[0].name}`;

            const addButton = document.createElement("button");
            addButton.textContent = "Agregar";
            addButton.onclick = () => addToPlaylist(track);

            li.appendChild(img);
            li.appendChild(text);
            li.appendChild(addButton);
            results.appendChild(li);
        });
    } catch (error) {
        console.error("Error en la búsqueda:", error);
        showNotification("Hubo un error al realizar la búsqueda: " + error.message);
    }
});

// Almacenar canciones seleccionadas
function addToPlaylist(track) {
    if (selectedTracks.find(t => t.id === track.id)) {
        showNotification("Esta canción ya está en la lista.");
        return;
    }
    selectedTracks.push(track);
    showNotification(`Canción agregada: ${track.name}`);
}

// Guardar en Spotify
document.getElementById("savePlaylistBtn").addEventListener("click", async () => {
    checkAccessToken();

    const playlistName = prompt("¿Cómo quieres llamar a tu playlist?");
    if (!playlistName) return alert("Debes dar un nombre a la playlist.");

    try {
        const response = await fetch("https://api.spotify.com/v1/me", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const userData = await response.json();
        const userId = userData.id;

        // Crear la playlist en Spotify
        const createPlaylistResponse = await fetch(
            `https://api.spotify.com/v1/users/${userId}/playlists`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: playlistName,
                    description: "Playlist creada con la app de Spotify Creator",
                    public: false,
                }),
            }
        );

        const createPlaylistData = await createPlaylistResponse.json();
        const playlistId = createPlaylistData.id;

        // Agregar canciones a la playlist
        const trackUris = []; // Arreglo para almacenar las URIs de las canciones

        // Repetir las canciones 20 veces y agregar sus URIs
        for (let i = 0; i < 20; i++) {
            selectedTracks.forEach(track => {
                trackUris.push(track.uri); // Agregar la URI de la canción
            });
        }

        await fetch(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    uris: trackUris,
                }),
            }
        );

        showNotification("Playlist guardada exitosamente.");
    } catch (error) {
        showNotification("Hubo un error al guardar la playlist.");
    }
});

// Agregar canciones alternadas a la playlist
document.getElementById("addAlternatedBtn").addEventListener("click", addAlternatedToPlaylist);

function addAlternatedToPlaylist() {
    const playlistLength = selectedTracks.length;
    if (playlistLength === 0) return showNotification("No hay canciones en la lista.");

    // Crear un nuevo arreglo para la lista de reproducción
    let playlistOrder = [];

    // Repetir las canciones en el orden original 20 veces
    for (let i = 0; i < 20; i++) {
        selectedTracks.forEach(track => {
            playlistOrder.push(track); // Agregar la canción en orden
        });
    }

    // Mostrar las canciones en el área de playlist
    playlist.innerHTML = ""; // Limpiar la lista antes de mostrar
    playlistOrder.forEach((track) => {
        const li = document.createElement("li");

        // Crear y agregar la imagen
        const img = document.createElement("img");
        img.src = track.album.images[0].url; // Asegúrate de que la imagen exista
        img.alt = track.name;
        img.classList.add("track-image");

        // Crear y agregar el texto
        const text = document.createElement("span");
        text.textContent = `${track.name} - ${track.artists[0].name}`;

        // Crear botón para quitar la canción
        const removeButton = document.createElement("button");
        removeButton.textContent = "Quitar";
        removeButton.onclick = () => {
            // Lógica para quitar la canción
            const index = selectedTracks.findIndex(t => t.id === track.id);
            if (index !== -1) {
                selectedTracks.splice(index, 1); // Quitar de la lista de seleccionados
                addAlternatedToPlaylist(); // Actualizar la lista de reproducción
                showNotification(`Canción quitada: ${track.name}`);
            }
        };

        // Agregar la imagen, el texto y el botón
        li.appendChild(img);
        li.appendChild(text);
        li.appendChild(removeButton);
        playlist.appendChild(li);
    });
}
// Redirigir al usuario a su página de playlists en Spotify
document.getElementById("viewPlaylistsBtn").addEventListener("click", () => {
    window.open("https://open.spotify.com/collection/playlists", "_blank");
});
