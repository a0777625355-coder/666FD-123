(function () {
  "use strict";
  const root = document.getElementById("view-music");
  if (!root) return;

  const providers = {
    apple: {
      heading: "Apple Music 尚未连接",
      docs: "https://developer.apple.com/musickit/"
    },
    spotify: {
      heading: "Spotify 尚未连接",
      docs: "https://developer.spotify.com/documentation/web-playback-sdk"
    },
    youtube: {
      heading: "YouTube 尚未连接",
      docs: "https://developers.google.com/youtube/iframe_api_reference"
    }
  };

  let active = "apple";
  const $ = id => document.getElementById(id);

  function selectProvider(name) {
    if (!providers[name]) return;
    active = name;
    const provider = providers[name];
    root.querySelectorAll("[data-music-provider]").forEach(button => {
      const selected = button.dataset.musicProvider === name;
      button.classList.toggle("is-on", selected);
      button.setAttribute("aria-checked", String(selected));
    });
    $("musicProviderHeading").textContent = provider.heading;
    $("onlineMusicQuery").placeholder = "连接 " + ({ apple: "Apple Music", spotify: "Spotify", youtube: "YouTube" }[name]) + " 后即可搜索…";
  }

  function escapeHtml(value) {
    const span = document.createElement("span");
    span.textContent = String(value || "");
    return span.innerHTML;
  }

  root.querySelectorAll("[data-music-provider]").forEach(button => button.addEventListener("click", () => selectProvider(button.dataset.musicProvider)));
  $("musicDocsBtn").addEventListener("click", () => window.open(providers[active].docs, "_blank", "noopener,noreferrer"));
  $("onlineMusicSearch").addEventListener("submit", event => {
    event.preventDefault();
    const query = $("onlineMusicQuery").value.trim();
    const providerName = { apple: "Apple Music", spotify: "Spotify", youtube: "YouTube" }[active];
    $("onlineMusicResults").innerHTML = '<div class="music-empty-state"><i>⌕</i><h4>' + (query ? providerName + " 尚未连接" : "请先输入歌曲或歌手") + '</h4></div>';
  });

  selectProvider(active);
})();
