#include <archive.h>
#include <archive_entry.h>
#include <stdio.h>
#include <stdlib.h>

int extractArchiveFromMemory(const void *data, size_t size)
{
    struct archive *a = archive_read_new();
    struct archive *ext = archive_write_disk_new();
    struct archive_entry *entry;
    int r;

    archive_read_support_format_all(a);
    archive_read_support_filter_all(a);

    archive_write_disk_set_options(ext,
        ARCHIVE_EXTRACT_TIME |
        ARCHIVE_EXTRACT_PERM |
        ARCHIVE_EXTRACT_ACL |
        ARCHIVE_EXTRACT_FFLAGS);

    r = archive_read_open_memory(a, data, size);
    if (r != ARCHIVE_OK) {
        fprintf(stderr, "open failed: %s\n", archive_error_string(a));
        goto cleanup;
    }

    while ((r = archive_read_next_header(a, &entry)) == ARCHIVE_OK) {

        printf("Extracting: %s\n", archive_entry_pathname(entry));

        r = archive_write_header(ext, entry);
        if (r != ARCHIVE_OK) {
            fprintf(stderr, "write header: %s\n",
                    archive_error_string(ext));
        } else {
            const void *buff;
            size_t buff_size;
            la_int64_t offset;

            while ((r = archive_read_data_block(
                        a, &buff, &buff_size, &offset))
                   == ARCHIVE_OK) {

                r = archive_write_data_block(
                        ext, buff, buff_size, offset);

                if (r != ARCHIVE_OK) {
                    fprintf(stderr, "write data: %s\n",
                            archive_error_string(ext));
                    break;
                }
            }
        }

        archive_write_finish_entry(ext);

        if (r != ARCHIVE_OK && r != ARCHIVE_EOF)
            break;
    }

    if (r != ARCHIVE_EOF && r != ARCHIVE_OK) {
        fprintf(stderr, "extract failed: %s\n",
                archive_error_string(a));
    }

cleanup:
    archive_write_free(ext);
    archive_read_free(a);

    return (r == ARCHIVE_EOF || r == ARCHIVE_OK) ? 0 : -1;
}