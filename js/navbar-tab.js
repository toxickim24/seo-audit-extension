document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll(".navlink");
    const contents = document.querySelectorAll(".navcontent");

    links.forEach(link => {
    link.addEventListener("click", () => {

        links.forEach(l => l.classList.remove("active"));
        contents.forEach(c => c.classList.remove("active"));

        link.classList.add("active");
        document.getElementById(link.dataset.target).classList.add("active");
    });
    });
});
