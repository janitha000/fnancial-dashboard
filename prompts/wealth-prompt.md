Wealth menu item should have the following functionality. (all values are in sri lankan lkr, csv detonimator is |)

1. Upload csv option, user will be given the option to efor a single month upload. If a single month is selected, the user will be asked to select the month and year. 

For single month upload 
    The csv file will contain following format
    1st column - wealth identifier (unique name)
    2nd column - sub wealth identifier (can be empty)
    3rd column - wealth for that month

    If 2nd column is provided, values provided in 1st column should be ignored when calculaing total

    Example
    NDB | |	26,587,380
    CAL UT| |	13,619,195
    Treasury Bills | |	4,790,928
    Stock Market | |	930,116
    NDB Wealth | |	1,003,404



For wealth identifier , there can be sub categories for it. For example, NDB can have sub categories like NDB Savings, NDB FD, NDB USD FD, NDB Treasury Bills, NDB Stock Market. 


The user should also have an option to delete a specific month, once deleted the whole months values will be removed.

Under the upload option there should be two tab views, one for month view and one for financial year view

Month view
- dashboards for that month
- + or - vaiaance based on the previose month
- pie chart showing breakdown of wealth
- bar chart showing monthly trend of wealth

Financial year view
- dashboards for that financial year
- + or - vaiaance based on the previose financial year
- pie chart showing breakdown of wealth
- bar chart showing monthly trend of wealth