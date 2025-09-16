// Get references to the image and button elements
const imageElement = document.getElementById('myImage');
const buttonElement = document.getElementById('changeButton');

// Define the different image sources you want to cycle through
const imageUrls = [
  'https://venueindustries.com/wp-content/uploads/2017/06/145814-Arlington-Chair-Black-Uphol-Seat1.jpg',
  'https://www.ikea.com/gb/en/images/products/ekedalen-chair-oak-hakebo-beige__1016610_pe830515_s5.jpg',
  'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiqa4x7JsFX8ItM5M2MOwmpVbQv2omTUeT0pqTUeqkXD5I9Rk26TiQv3LkinCoyE1I3q0mXX46YM-ocyvvnR4-hfiVBPi-8HCO14WOsyMn1Xguzcbn7Fge0Ra7aBf55d1vVcdSuUnLLQo3benC63YlL-YSFgqfE3T9_0f2pvP8y1PJi3iJigpfhPijEjTc/w431-h378/chair.jpeg'
];

// Keep track of the current image index
let currentImageIndex = 0;

// Add an event listener to the button
buttonElement.addEventListener('click', function() {
  // Increment the index, and loop back to the start if we've reached the end
  currentImageIndex = (currentImageIndex + 1) % imageUrls.length;

  // Update the image source
  imageElement.src = imageUrls[currentImageIndex];
});