const clientId = "2a1d7d4e43384a1f813a74df83845b5c"; // Reemplaza con tu Client ID
const redirectUri = "https://army-borahae.github.io/for-army.com/"; // URI configurada en Spotify Dashboard

let accessToken = null;
let selectedTracks = []; // Variable para almacenar las canciones seleccionadas

// Solicitar permisos para crear playlists y modificarlas
const scopes = 'user-read-private playlist-modify-public playlist-modify-private';
const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

// Función para redirigir al usuario a Spotify para que otorgue permisos
function authorizeSpotify() {
    window.location.href = authUrl;
}

// Obtener el token de acceso de la URL después de la redirección
function getAccessTokenFromUrl() {
    const hash = window.location.hash.substring(1);  // Obtener la parte del hash de la URL
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    console.log("Token de acceso extraído:", token); // Depurar el token
    return token;
}

if (window.location.hash) {
    accessToken = getAccessTokenFromUrl();
    if (accessToken) {
        console.log("Access Token:", accessToken);  // Verifica que el token esté presente
    } else {
        console.log("No se encontró el token de acceso.");
    }
}

// Verificar si el token de acceso está presente
function checkAccessToken() {
    if (!accessToken) {
        alert("Tu token ha expirado. Por favor, vuelve a autorizar la aplicación.");
        authorizeSpotify();  // Redirige para autorizar
    }
}

// Función para mostrar las notificaciones en pantalla
function showNotification(message) {
    const notification = document.getElementById("notification");
    const notificationText = document.getElementById("notification-text");

    // Establecer el mensaje
    notificationText.textContent = message;

    // Mostrar la notificación
    notification.style.display = "block";
    notification.classList.add("show");

    // Ocultar la notificación después de 3 segundos
    setTimeout(() => {
        notification.classList.remove("show");
        notification.style.display = "none";
    }, 3000);  // Desaparece después de 3 segundos
}

// Buscar canciones
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const results = document.getElementById("results");
const playlist = document.getElementById("playlist");

searchBtn.addEventListener("click", async () => {
    const query = searchInput.value;
    if (!query) return alert("Por favor, ingresa una búsqueda.");

    if (isTokenExpired()) {
        await refreshToken();
        return;
    }

    showLoading("Buscando canciones...");
    
    try {
        const response = await fetch(
            `https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.text(); // Ver el error de la respuesta
            throw new Error(`Error ${response.status}: ${errorData}`);
        }

        const data = await response.json();
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
        alert("Hubo un error al realizar la búsqueda: " + error.message);
    } finally {
        hideLoading();  // Ocultar indicador de carga después de la búsqueda
    }
});

// Almacenar canciones seleccionadas
function addToPlaylist(track) {
    // Verificar si la canción ya ha sido agregada
    

    selectedTracks.push(track); // Agregar la canción a la lista
    showNotification(`Canción agregada: ${track.name}`);
}

// Agregar canciones alternadas a la playlist
function addAlternatedToPlaylist() {
    const playlistLength = selectedTracks.length;
    if (playlistLength === 0) return alert("No hay canciones en la lista.");

    // Crear un nuevo arreglo para las canciones repetidas
    let playlistOrder = [];
    for (let i = 0; i < 20; i++) { // Repetir 20 veces
        for (let j = 0; j < playlistLength; j++) {
            playlistOrder.push(selectedTracks[j]); // Agregar la canción en orden
        }
    }

    // Mostrar las canciones en el área de playlist
    playlist.innerHTML = "";
    playlistOrder.forEach((track) => {
        const li = document.createElement("li");

        const img = document.createElement("img");
        img.src = track.album.images[0].url; // Obtener la imagen del álbum
        img.alt = track.name;
        img.classList.add("track-image"); // Asegúrate de tener estilos para esta clase

        const text = document.createElement("span");
        text.textContent = `${track.name} - ${track.artists[0].name}`;

        li.appendChild(img);
        li.appendChild(text);
        playlist.appendChild(li);
    });
}

document.getElementById("addAlternatedBtn").addEventListener("click", addAlternatedToPlaylist);

// Guardar playlist en Spotify
document.getElementById("savePlaylistBtn").addEventListener("click", async () => {
    if (isTokenExpired()) {
        await refreshToken();
        return;
    }

    showLoading("Guardando playlist...");
    
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
        const trackUris = selectedTracks.map((track) => track.uri);
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
        console.error("Error al guardar la playlist:", error);
        showNotification("Hubo un error al guardar la playlist.");
    } finally {
        hideLoading();  // Ocultar indicador de carga después de guardar
    }
});

document.getElementById("viewPlaylistsBtn").addEventListener("click", () => {
    alert("Dirígete a tu Spotify para que puedas ver tu playlist y disfruta 💜💜.");
});
// Mostrar indicador de carga
function showLoading(message) {
    const loadingElement = document.getElementById("loading");
    loadingElement.textContent = message;
    loadingElement.style.display = "block";
}

// Ocultar indicador de carga
function hideLoading() {
    const loadingElement = document.getElementById("loading");
    loadingElement.style.display = "none";
}

// Verificar si el token de acceso ha expirado
function isTokenExpired() {
    // Lógica para verificar si el token ha expirado (si es necesario)
    return !accessToken;  // Aquí estamos asumiendo que si no hay token, está expirado
}

// Función para refrescar el token (si se implementa un flujo de refresh)
async function refreshToken() {
    // Aquí puedes implementar la lógica para refrescar el token (si es necesario)
    alert("Tu token ha expirado. Por favor, vuelve a autorizar la aplicación.");
    authorizeSpotify();
}
