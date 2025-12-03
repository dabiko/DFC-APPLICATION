# Search Implementation Checklist

## Quick Start Guide (Minimal Setup)

### Phase 1: Basic Setup (2-3 hours)

- [ ] **Install Elasticsearch**
  ```bash
  docker run -d --name elasticsearch -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" elasticsearch:8.11.0
  ```

- [ ] **Install Python packages**
  ```bash
  pip install elasticsearch==8.11.0 django-elasticsearch-dsl==8.0
  ```

- [ ] **Create search app**
  ```bash
  python manage.py startapp search
  ```

- [ ] **Add to INSTALLED_APPS**
  ```python
  INSTALLED_APPS = [
      # ...
      'django_elasticsearch_dsl',
      'apps.search',
  ]
  ```

- [ ] **Configure Elasticsearch in settings.py**
  ```python
  ELASTICSEARCH_DSL = {
      'default': {
          'hosts': 'localhost:9200'
      }
  }
  ```

### Phase 2: Core Models & Documents (3-4 hours)

- [ ] **Create RecentSearch model** (`apps/search/models.py`)
- [ ] **Run migrations**
  ```bash
  python manage.py makemigrations search
  python manage.py migrate search
  ```

- [ ] **Create Elasticsearch document** (`apps/search/documents.py`)
- [ ] **Create index**
  ```bash
  python manage.py search_index --create
  ```

- [ ] **Index existing documents**
  ```bash
  python manage.py search_index --populate
  ```

### Phase 3: API Endpoints (4-5 hours)

- [ ] **Create serializers** (`apps/search/serializers.py`)
- [ ] **Create views** (`apps/search/views.py`)
  - [ ] `search_view` - Full search
  - [ ] `quick_search_view` - Quick search
  - [ ] `suggestions_view` - Autocomplete
  - [ ] `recent_searches_view` - Recent searches

- [ ] **Create URLs** (`apps/search/urls.py`)
- [ ] **Add to main urls.py**
  ```python
  path('api/v1/search/', include('apps.search.urls'))
  ```

### Phase 4: Permission Filtering (2-3 hours)

- [ ] **Create permissions.py**
- [ ] **Implement `filter_results_by_permissions()`**
- [ ] **Test permission filtering**

### Phase 5: Auto-Indexing (2-3 hours)

- [ ] **Create signals** (`apps/search/signals.py`)
- [ ] **Register signals** (`apps/search/apps.py`)
- [ ] **Test auto-indexing** (create/update/delete document)

### Phase 6: Testing (2-3 hours)

- [ ] **Test quick search**
  ```bash
  curl -H "Authorization: Bearer YOUR_TOKEN" \
    "http://localhost:8000/api/v1/search/quick/?q=budget"
  ```

- [ ] **Test full search**
  ```bash
  curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query":"budget","mode":"simple","page":1}' \
    http://localhost:8000/api/v1/search/
  ```

- [ ] **Test suggestions**
  ```bash
  curl -H "Authorization: Bearer YOUR_TOKEN" \
    "http://localhost:8000/api/v1/search/suggestions/?q=bud"
  ```

- [ ] **Test recent searches**
  ```bash
  # Save
  curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query":"test"}' \
    http://localhost:8000/api/v1/search/recent/

  # Get
  curl -H "Authorization: Bearer YOUR_TOKEN" \
    http://localhost:8000/api/v1/search/recent/
  ```

- [ ] **Run automated tests**
  ```bash
  python manage.py test apps.search
  ```

### Phase 7: Frontend Integration (1 hour)

- [ ] **Remove DEV_MODE mock data from frontend**
  - Edit `frontend/src/services/search.service.ts`
  - Remove/comment out all `if (DEV_MODE && error?.response?.status === 404)` blocks

- [ ] **Test frontend with real API**
  - [ ] Open global search (Ctrl+K)
  - [ ] Type query and see real results
  - [ ] Test autocomplete
  - [ ] Test recent searches
  - [ ] Navigate to full search page
  - [ ] Test filters
  - [ ] Test export

- [ ] **Remove console warnings**
  - Edit `frontend/src/services/apiClient.ts`
  - Remove the search endpoint suppression code

---

## Optional Enhancements

### Advanced Features (Optional)

- [ ] **Text Extraction** (`apps/search/tasks.py`)
  - [ ] PDF extraction (PyPDF2)
  - [ ] Word extraction (python-docx)
  - [ ] Excel extraction (openpyxl)
  - [ ] OCR for images (tesseract)

- [ ] **Export Functionality**
  - [ ] CSV export
  - [ ] Excel export

- [ ] **Faceted Search**
  - [ ] Document type aggregations
  - [ ] Department aggregations
  - [ ] Date range aggregations

- [ ] **Advanced Filters**
  - [ ] File size filter
  - [ ] Created by filter
  - [ ] Date range filter

---

## Verification Steps

### 1. Check Elasticsearch is Running
```bash
curl http://localhost:9200
# Should return cluster info
```

### 2. Check Index Exists
```bash
curl http://localhost:9200/_cat/indices
# Should show 'documents' index
```

### 3. Check Documents are Indexed
```bash
curl http://localhost:9200/documents/_count
# Should show count > 0
```

### 4. Test Search Query Directly
```bash
curl -X POST http://localhost:9200/documents/_search -H 'Content-Type: application/json' -d '{
  "query": {
    "multi_match": {
      "query": "budget",
      "fields": ["file_name", "title", "tags"]
    }
  }
}'
```

### 5. Test API Endpoints
```bash
# Quick search
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/search/quick/?q=test"

# Should return JSON with results array
```

---

## Common Issues & Solutions

### Issue: Elasticsearch not starting
**Solution:**
```bash
# Check logs
docker logs elasticsearch

# Or
journalctl -u elasticsearch
```

### Issue: Index not created
**Solution:**
```bash
# Force create
python manage.py search_index --create -f

# Or delete and recreate
python manage.py search_index --delete -f
python manage.py search_index --create
```

### Issue: No documents indexed
**Solution:**
```bash
# Check if documents exist
python manage.py shell
>>> from apps.documents.models import Document
>>> Document.objects.count()

# Re-populate index
python manage.py search_index --populate
```

### Issue: Search returns no results
**Checklist:**
1. Verify documents are indexed: `curl http://localhost:9200/documents/_count`
2. Check permission filtering isn't too restrictive
3. Test query directly in Elasticsearch
4. Check user has permissions to view documents

### Issue: Permission denied errors
**Solution:**
- Check `filter_results_by_permissions()` logic
- Verify user has correct department/role
- Check confidentiality level filtering

---

## Production Deployment

### Before Going Live

- [ ] **Security**
  - [ ] Enable Elasticsearch authentication
  - [ ] Use HTTPS for all endpoints
  - [ ] Rate limiting configured
  - [ ] API keys secured

- [ ] **Performance**
  - [ ] Elasticsearch cluster (3+ nodes)
  - [ ] Caching enabled (Redis)
  - [ ] CDN for static files
  - [ ] Database query optimization

- [ ] **Monitoring**
  - [ ] Elasticsearch metrics (Kibana)
  - [ ] API response time monitoring
  - [ ] Error tracking (Sentry)
  - [ ] Audit logging

- [ ] **Backup**
  - [ ] Elasticsearch snapshots configured
  - [ ] Backup schedule set
  - [ ] Restore procedure tested

- [ ] **Load Testing**
  - [ ] Test with 100 concurrent users
  - [ ] Test with large result sets
  - [ ] Test with complex filters
  - [ ] Verify response times < 1s

---

## Estimated Timeline

### Minimal Working Implementation
**Total: 15-20 hours**
- Setup: 2-3 hours
- Models: 3-4 hours
- APIs: 4-5 hours
- Permissions: 2-3 hours
- Auto-indexing: 2-3 hours
- Testing: 2-3 hours

### With All Features
**Total: 30-40 hours**
- Above: 15-20 hours
- Text extraction: 5-6 hours
- Export: 2-3 hours
- Facets: 3-4 hours
- Advanced filters: 2-3 hours
- Performance tuning: 3-4 hours

---

## Success Criteria

✅ Elasticsearch running and accessible
✅ All documents indexed
✅ Quick search returns results < 200ms
✅ Full search returns results < 1s
✅ Autocomplete works
✅ Recent searches saved
✅ Permission filtering working correctly
✅ Auto-indexing on create/update/delete
✅ Frontend integrated and working
✅ All tests passing

---

## Support Resources

- **Elasticsearch DSL Docs**: https://elasticsearch-dsl.readthedocs.io/
- **Django Elasticsearch DSL**: https://django-elasticsearch-dsl.readthedocs.io/
- **Elasticsearch Guide**: https://www.elastic.co/guide/
- **API Specification**: See `SEARCH_API_SPECIFICATION.md`
- **Implementation Guide**: See `BACKEND_SEARCH_IMPLEMENTATION_GUIDE.md`

---

**Ready to Start?**

Begin with Phase 1 and work through each checkbox systematically. Good luck! 🚀
