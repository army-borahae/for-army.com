const clientId = "2a1d7d4e43384a1f813a74df83845b5c"; // Reemplaza con tu Client ID
const redirectUri = "https://army-borahae.github.io/for-army.com/"; // URI configurada en Spotify Dashboard


let accessToken = "BQBUtg99FV6tFO78Umkr2FblyTVc_x52JcnzqJNwj-zG_Ke7NPeDLM7iazkTZvV6G7ALG2r9LvMmUw14nzodsgsrcTHIG1ntLzOegLI1-rwX8Ns8rTr8KYDfFB-2h-v-B2-qv0KQNO_TvlueAxZYavn6ayIFdeerzv6f-BbD_zBzelDZyAZpGPiGWaMrfBYWweGVa0ibPLIYz9fccikPMAKyw9V4s90SoOs6QvaHg_oloyRs55K1Tg8sRezOic8irvafoipKkvtC9DRp_2NIsrK6FJVxLiN9"; // Reemplaza con tu token de acceso
const userId = "31fjrd3j533r3ett4dcmcygy7k54"; // Reemplaza con tu User ID

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
        const response = await fetch(
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
    const playlistName = prompt("¿Cómo quieres llamar a tu playlist?");
    if (!playlistName) return alert("Debes dar un nombre a la playlist.");

    try {
        // Crear la playlist en tu cuenta de Spotify
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
        const trackUris = selectedTracks.map(track => track.uri);

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

// Redirigir al usuario a tu página de playlists en Spotify
document.getElementById("viewPlaylistsBtn").addEventListener("click", () => {
    window.open(`https://open.spotify.com/user/${userId}/collection/playlists`, "_blank");
});
