import React from 'react';

function Header() {
    return (
        <header>
            <h1>Flight Tracker</h1>
            <nav>
                <a href="/">Home</a>
                <a href="/flights">Flights</a>
                <a href="/about">About</a>
            </nav>
        </header>
    );
}

export default Header;