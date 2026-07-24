function scrollGames() {
    document.getElementById("games").scrollIntoView({
        behavior: "smooth"
    });
}

// Lekkie animacje przy scrollu
window.addEventListener('scroll', () => {
    document.querySelectorAll('.card').forEach((card, i) => {
        if (card.getBoundingClientRect().top < window.innerHeight * 0.8) {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }
    });
});
