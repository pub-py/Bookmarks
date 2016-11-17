# Bookmarks
> 解析chrome bookmarks，方便操作


```
import json

from books2json import BookMarks

if __name__ == '__main__':
    bk = BookMarks('./bookmarks.html').dedup()

    print json.dumps(bk.to_dict())

    with open("./bkm.html", "w") as f:
        f.write(bk.to_html())
```