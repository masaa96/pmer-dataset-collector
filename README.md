# pmer-dataset-collector

I want to create a web application that will be hosted on AWS for collecting data for my master thesis.

This is structure:
- Login page: collect users info like username or email (do I need to store password or not, since it's open to everyone app character?), do I need auth?
- Home page: It should at the top have a counter like a line up to 1000 to track a progress from already collected data (now I have 150 compositions collected out of 1000).
Progress bar at the top should always be visible, except on login page. Maybe there can be added tab bar below progress so user can easily go back to home, or have an option to go back to labeled-composers, unlabeled-composers.
Also it should have two big buttons on the screen "Labeled Compositions", "Unlabeled Compositions", where by clicking one of them we are entering a new page, both of new pages should have a same page structure.

- Labeled compositions: On this page we will have buttons for every composer from the dataset, and beside button number of compositions labeled.
When clicked it goes to another page.

- Labeled + composer page: This page have similar structure as previous - compositions are listed in a matrix view like a buttons, with number of emotions labeled to them. When clicked on one of them new page opens.

- Labeled + composer + composition page: This page contains a youtube video embedded, so user can click play button like regular youtube. This is on the left side of the screen, and on the right side there will be labels of emotions already assign to this composition, which cannot be deleted (if it's button it cannot be clicked). And below there should be buttons for other emotions that are clickable, and if selected, that emotions should be assigned to this composition in the dataset. Also some "+" button should exist there if the emotion user is feeling while listening doesn't exist in the list of possible ones, and should be added in the future to that list (like all existing emotions from the dataset). If user add here some emotions, that doesn't change progress bar, since it measures how many unique compositions are labeled.

Same thing for unlabeled.

- Unlabeled compositions: On this page we will have buttons for every composer from the dataset that doesn't have assigned any emotion with it.
Here we need to have button "+" if user want to add new composer that doesn't exist in the list of composers. It is desirable, because we want more different data.
When clicked it goes to another page.

- Unlabeled + composer page: This page have similar structure as previous - compositions are listed in a matrix view like a buttons, with number of emotions labeled to them. 
Here we also should have "+" button if some composer list doesn't have composition they want, so they can add new composition to already existing composer. When adding new composition, pop up should ask for composition name, opus, number, and the youtube link, so we can add it to the dataset fully.
When clicked on one of them new page opens.

- Unlabeled + composer + composition page: This page contains a youtube video embedded, so user can click play button like regular youtube. This is on the left side of the screen, and on the right side there should be buttons for all emotions that are clickable, and if selected, that emotions should be assigned to this composition in the dataset. Also some "+" button should exist there if the emotion user is feeling while listening doesn't exist in the list of possible ones, and should be added in the future to that list (like all existing emotions from the dataset). If user add here some emotions, that doesn't change progress bar, since it measures how many unique compositions are labeled.
When new composition is labeled, progress bar should be changed.

Can you just create a best architectural structure following clean code and best practices for this simple app. What database should be used, if this will be stored on AWS, can I use mongodb?
For now just create a markdown file with proposed project structure for files, and architecture with all necessary details.