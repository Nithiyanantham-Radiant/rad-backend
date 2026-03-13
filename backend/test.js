const express = require('express');
console.log('Express loaded');
try {
    const axios = require('axios');
    console.log('Axios loaded');
} catch (e) {
    console.error('Axios failed');
}
