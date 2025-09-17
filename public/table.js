.sub-list {
  display: none; /* This is the key part to hide the sublists initially */
  list-style-type: none; /* Removes the bullet points for the sublist */
  padding-left: 20px; /* Indents the sublist */
}

.parent-item {
  cursor: pointer; /* Changes the cursor to a pointer when hovering over the clickable area */
}

/* Optional styling to indicate an open state */
.sub-list.active {
  display: block;
}